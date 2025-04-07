import pandas as pd
import numpy as np
import time
from joblib import load
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from tqdm import tqdm
import matplotlib.pyplot as plt
import seaborn as sns
from openai import OpenAI
import json
import gdown
import os

# Initialize OpenAI client configured for OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv('OPENAI_API_KEY')

)

# Configuration
SAMPLE_SIZE = 30
PLOT_PATH = 'comparison_results.png'
MODEL_NAME = "meta-llama/llama-4-maverick:free"
DATASET_PATH = 'data/notjs.csv'

def load_and_prepare_data(filepath):
    """Load dataset and extract only numeric features/labels safely."""
    try:
        dataset = pd.read_csv(filepath, index_col=0, encoding='utf-8', encoding_errors='replace')
        print(f"Dataset columns: {dataset.columns.tolist()}")

        if dataset.shape[1] < 2:
            raise ValueError("Dataset must have at least one feature column and one label column.")

        dataset['label'] = dataset.iloc[:, -1]
        feature_cols = dataset.select_dtypes(include=[np.number]).columns.drop('label')
        return dataset, feature_cols

    except Exception as e:
        print(f"Error loading data: {str(e)}")
        raise

def run_original_classifier(features, labels, sample_size):
    """Run Random Forest classifier and return sampled test data and predictions"""
    print("\n=== RUNNING RANDOM FOREST CLASSIFIER ===")
    model = load('data/notjs.joblib')

    if features.shape[1] > 42:
        features = features[:, :42]
        print("Using first 42 features to match original model")
    elif features.shape[1] < 42:
        raise ValueError(f"Need at least 42 features, got {features.shape[1]}")

    X_train, X_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.20, random_state=42)

    # Sample the same indices for both models
    np.random.seed(42)
    sample_indices = np.random.choice(len(X_test), size=min(sample_size, len(X_test)), replace=False)
    X_sample = X_test[sample_indices]
    y_sample = y_test[sample_indices]

    y_pred = model.predict(X_sample)

    print("\nRandom Forest Results:")
    print(classification_report(y_sample, y_pred))

    cm = confusion_matrix(y_sample, y_pred)
    plt.figure(figsize=(6, 4))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Non-tracking', 'Tracking'],
                yticklabels=['Non-tracking', 'Tracking'])
    plt.title('Random Forest Confusion Matrix')
    plt.savefig('rf_results.png')
    plt.close()

    return X_sample, y_sample, y_pred


def query_llama(X_sample, y_sample, feature_names):
    """Query Llama model using a fixed sample set"""
    system_prompt = """You MUST respond with ONLY valid JSON in this exact format:
    {
        "classification": 0 or 1,
        "confidence": "high/medium/low",
        "reason": "brief technical explanation"
    }"""

    results = []

    for idx in tqdm(range(len(X_sample)), desc=f"Querying {MODEL_NAME}"):
        feat = X_sample[idx]
        label = y_sample[idx]
        feat_desc = "\n".join([f"{feature_names[i]}: {val:.4f}" for i, val in enumerate(feat)])
        
        max_attempts = 3
        attempts = 0
        success = False
        
        while attempts < max_attempts and not success:
            try:
                temperature = 0.1 + (attempts * 0.1)

                completion = client.chat.completions.create(
                    extra_headers={
                        "HTTP-Referer": "https://github.com/your-repo",
                        "X-Title": "CSE527 Project"
                    },
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Classify these features (respond ONLY with JSON):\n{feat_desc}"}
                    ],
                    temperature=temperature,
                    response_format={"type": "json_object"}
                )

                content = completion.choices[0].message.content.strip()
                result = json.loads(content)

                classification = int(result.get("classification", -1))
                if classification not in [0, 1]:
                    raise ValueError("Invalid classification")

                confidence = result.get("confidence", "medium").lower()
                if confidence not in ["high", "medium", "low"]:
                    confidence = "medium"

                results.append({
                    "true_label": int(label),
                    "predicted": classification,
                    "confidence": confidence,
                    "reason": result.get("reason", "No reason provided")
                })
                success = True

            except Exception as e:
                attempts += 1
                if attempts == max_attempts:
                    print(f"\nFailed after {max_attempts} attempts on sample {idx}: {str(e)}")
                    print(f"Response: {content if 'content' in locals() else 'No content'}")
                else:
                    time.sleep(1)

        time.sleep(3)  # avoid hitting limits

    return pd.DataFrame(results)


def main():
    try:
        dataset, feature_cols = load_and_prepare_data(DATASET_PATH)
        print(f"\nLoaded dataset with {len(dataset)} samples and {len(feature_cols)} features")

        labels = dataset['label'].values
        features = dataset[feature_cols].values

        X_sample, y_sample, rf_preds = run_original_classifier(features, labels, SAMPLE_SIZE)

        feature_names = [f"Feature {i+1}" for i in range(len(feature_cols))]
        llama_results = query_llama(X_sample, y_sample, feature_names)

        if not llama_results.empty:
            print("\nLlama Model Results:")
            print(classification_report(
                llama_results['true_label'],
                llama_results['predicted'],
                zero_division=0
            ))

            cm = confusion_matrix(llama_results['true_label'], llama_results['predicted'])
            plt.figure(figsize=(6, 4))
            sns.heatmap(cm, annot=True, fmt='d', cmap='Oranges',
                        xticklabels=['Non-tracking', 'Tracking'],
                        yticklabels=['Non-tracking', 'Tracking'])
            plt.title('Llama Classification Results')
            plt.savefig('llama_results.png')

            llama_results.to_csv('llama_predictions.csv', index=False)
            print("\nSaved Llama results to llama_predictions.csv")
        else:
            print("\nLlama evaluation failed - no valid responses")

    except Exception as e:
        print(f"\nFatal error: {str(e)}")


if __name__ == "__main__":
    main()
