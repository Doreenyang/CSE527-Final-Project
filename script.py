import gdown
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from openai import OpenAI
import time
from joblib import load
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from tqdm import tqdm
import sklearn
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import json
from tqdm import tqdm

client = OpenAI(api_key="")

# Configuration
SAMPLE_SIZE = 11  # Adjust based on your needs
PLOT_PATH = 'comparison_results.png'

def fix_feature_mismatch(X_test, expected_features=42):
    """Ensure feature dimensions match the model's expectations"""
    if X_test.shape[1] > expected_features:
        print(f"Reducing features from {X_test.shape[1]} to {expected_features}")
        return X_test[:, :expected_features]
    return X_test

def getResults(path):
    df = pd.read_csv(path)
    df = df[df['num_req_sent'] != 0]
    fn = ((df['label'] == 1) & (df['prediction'] == 0)).sum()
    tp = ((df['label'] == 1) & (df['prediction'] == 1)).sum()
    tn = ((df['label'] == 0) & (df['prediction'] == 0)).sum()
    fp = ((df['label'] == 0) & (df['prediction'] == 1)).sum()
    precision = tp/(tp+fp)
    recall = tp/(tp+fn)
    f1score = (2 * precision * recall)/(precision + recall)
    return precision, recall, f1score

def query_gpt4(features, labels, feature_names, sample_size=11):
    """Enhanced GPT-4 query with confidence scores"""
    system_prompt = """You are an expert classifier for JavaScript functions. Analyze the features and classify whether each function is:
    - Tracking (1): Performs user tracking, data collection, or analytics
    - Non-tracking (0): Regular functionality with no tracking
    
    Consider these feature aspects:
    * Network activity patterns
    * Data storage behavior
    * Function call patterns
    * Script context
    
    Respond ONLY with JSON format:
    {
        "classification": 0 or 1,
        "confidence": "high/medium/low",
        "reason": "brief explanation"
    }"""
    
    indices = np.random.choice(len(features), size=min(sample_size, len(features)), replace=False)
    results = []
    
    for idx in tqdm(indices, desc="Querying GPT-4"):
        feat = features[idx]
        label = labels[idx]
        
        # Create feature description
        feat_desc = "\n".join([f"{name}: {val:.4f}" for name, val in zip(feature_names, feat)])
        
        user_prompt = f"""Analyze these function features:
        {feat_desc}
        
        Provide JSON response with classification, confidence, and brief reason."""
        
        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            results.append({
                "true_label": int(label),
                "predicted": int(result["classification"]),
                "confidence": result["confidence"],
                "indicators": result.get("indicators", [])
            })
            
            time.sleep(1)  # Rate limiting
            
        except Exception as e:
            print(f"\nError on sample {idx}: {e}")
            continue
    
    return pd.DataFrame(results)

def evaluate_model(y_true, y_pred):
    """Robust evaluation with zero_division handling"""
    return classification_report(
        y_true, y_pred,
        output_dict=True,
        zero_division=0  # Handle undefined metrics
    )




def main():
    # Load data
    dataset = pd.read_csv('data/notjs.csv').drop_duplicates(
        subset=["script_name","method_name"], keep='last')
    
    # Get feature names
    feature_names = dataset.columns[4:].tolist()
    
    # Prepare data
    labels = dataset['label'].values
    features = dataset.iloc[:, 4:].values
    X_train, X_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.20, random_state=42)
    
    # Random Forest Evaluation
    try:
        model = load('data/notjs.joblib')
        X_test_fixed = fix_feature_mismatch(X_test, expected_features=42)
        y_pred_rf = model.predict(X_test_fixed)
        rf_report = evaluate_model(y_test, y_pred_rf)
        print("\nRandom Forest Results:")
        print(pd.DataFrame(rf_report).transpose())
    except Exception as e:
        print(f"\nError loading Random Forest model: {e}")
        print("Consider retraining the model with current scikit-learn version")
        rf_metrics = (0, 0, 0)  # Placeholder if model fails
    
    # GPT-4 Evaluation
    gpt_results = query_gpt4(X_test, y_test, feature_names, sample_size=50)
    
    if len(gpt_results) >= 10:  # Minimum meaningful sample
        gpt_report = evaluate_model(
            gpt_results['true_label'].values,
            gpt_results['predicted'].values
        )
        print("\nGPT-4 Results:")
        print(pd.DataFrame(gpt_report).transpose())
        
        # Save detailed results
        gpt_results.to_csv('gpt4_results.csv', index=False)
        print("\nSample GPT-4 Classifications:")
        print(gpt_results.head(10))
    else:
        print("\nInsufficient GPT-4 responses for evaluation")


if __name__ == "__main__":
    main()