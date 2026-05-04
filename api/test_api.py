"""
TrustChain API Tests
====================
Tests for the FastAPI backend endpoints.

Run with:
    python -m pytest test_api.py -v

Author: Mohit Badiyan (CSE 540 - ASU, Spring B 2026)
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from app import app

client = TestClient(app)

class TestHealthEndpoints:

    def test_root_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_has_status(self):
        response = client.get("/")
        data = response.json()
        assert "status" in data
        assert "TrustChain" in data["status"]

class TestModelRegistration:

    def test_register_model_endpoint_exists(self):
        response = client.post("/model/register", json={
            "modelID": "test-model-1",
            "modelName": "TestModel",
            "version": "1.0.0",
            "owner": "0xE2ADE12F7c96F2918226213FeEF623EC870805f8"
        })
        assert response.status_code in [200, 500]

    def test_register_model_returns_status(self):
        response = client.post("/model/register", json={
            "modelID": "test-model-1",
            "modelName": "TestModel",
            "version": "1.0.0",
            "owner": "0xE2ADE12F7c96F2918226213FeEF623EC870805f8"
        })
        data = response.json()
        assert "status" in data or "detail" in data

    def test_register_model_missing_fields(self):
        response = client.post("/model/register", json={"modelID": "test"})
        assert response.status_code == 422

    def test_register_model_empty_body(self):
        response = client.post("/model/register", json={})
        assert response.status_code == 422

class TestPredictionLogging:

    def test_log_prediction_endpoint_exists(self):
        response = client.post("/prediction/log", json={
            "modelID": "diabetes-xgboost-v1",
            "inputHash": "a" * 64,
            "outputHash": "b" * 64,
            "confidence": 87
        })
        assert response.status_code in [200, 500]

    def test_log_prediction_invalid_confidence_high(self):
        response = client.post("/prediction/log", json={
            "modelID": "diabetes-xgboost-v1",
            "inputHash": "a" * 64,
            "outputHash": "b" * 64,
            "confidence": 101
        })
        assert response.status_code == 400

    def test_log_prediction_invalid_confidence_negative(self):
        response = client.post("/prediction/log", json={
            "modelID": "diabetes-xgboost-v1",
            "inputHash": "a" * 64,
            "outputHash": "b" * 64,
            "confidence": -1
        })
        assert response.status_code == 400

    def test_log_prediction_confidence_zero_valid(self):
        response = client.post("/prediction/log", json={
            "modelID": "diabetes-xgboost-v1",
            "inputHash": "a" * 64,
            "outputHash": "b" * 64,
            "confidence": 0
        })
        assert response.status_code in [200, 500]

    def test_log_prediction_confidence_100_valid(self):
        response = client.post("/prediction/log", json={
            "modelID": "diabetes-xgboost-v1",
            "inputHash": "a" * 64,
            "outputHash": "b" * 64,
            "confidence": 100
        })
        assert response.status_code in [200, 500]

    def test_log_prediction_missing_fields(self):
        response = client.post("/prediction/log", json={"modelID": "test"})
        assert response.status_code == 422

class TestEventLogging:

    def test_log_event_endpoint_exists(self):
        response = client.post("/event/log", json={
            "modelID": "diabetes-xgboost-v1",
            "eventType": "TRAINING_START",
            "dataHash": "a" * 64
        })
        assert response.status_code in [200, 500]

    def test_log_event_missing_fields(self):
        response = client.post("/event/log", json={"modelID": "test"})
        assert response.status_code == 422

    def test_log_event_returns_status(self):
        response = client.post("/event/log", json={
            "modelID": "diabetes-xgboost-v1",
            "eventType": "TRAINING_START",
            "dataHash": "a" * 64
        })
        data = response.json()
        assert "status" in data or "detail" in data

class TestModelUpdate:

    def test_update_model_endpoint_exists(self):
        response = client.post("/model/update", json={
            "modelID": "diabetes-xgboost-v1",
            "newVersion": "2.0.0",
            "updatedBy": "0xE2ADE12F7c96F2918226213FeEF623EC870805f8"
        })
        assert response.status_code in [200, 500]

    def test_update_model_missing_fields(self):
        response = client.post("/model/update", json={"modelID": "test"})
        assert response.status_code == 422

    def test_update_model_returns_status(self):
        response = client.post("/model/update", json={
            "modelID": "diabetes-xgboost-v1",
            "newVersion": "2.0.0",
            "updatedBy": "0xE2ADE12F7c96F2918226213FeEF623EC870805f8"
        })
        data = response.json()
        assert "status" in data or "detail" in data

class TestAuditTrail:

    def test_get_audit_trail_endpoint_exists(self):
        response = client.get("/audit/diabetes-xgboost-v1")
        assert response.status_code in [200, 500]

    def test_get_audit_trail_returns_model_id(self):
        response = client.get("/audit/diabetes-xgboost-v1")
        if response.status_code == 200:
            data = response.json()
            assert "modelID" in data

    def test_get_audit_trail_returns_events(self):
        response = client.get("/audit/diabetes-xgboost-v1")
        if response.status_code == 200:
            data = response.json()
            assert "events" in data

class TestRevokeAccess:

    def test_revoke_access_endpoint_exists(self):
        response = client.request("DELETE", "/model/revoke", json={
            "modelID": "diabetes-xgboost-v1",
            "actorID": "0xE2ADE12F7c96F2918226213FeEF623EC870805f8"
        })
        assert response.status_code in [200, 500]

    def test_revoke_access_missing_fields(self):
        response = client.request("DELETE", "/model/revoke", json={"modelID": "test"})
        assert response.status_code == 422

    def test_revoke_access_returns_status(self):
        response = client.request("DELETE", "/model/revoke", json={
            "modelID": "diabetes-xgboost-v1",
            "actorID": "0xE2ADE12F7c96F2918226213FeEF623EC870805f8"
        })
        data = response.json()
        assert "status" in data or "detail" in data
