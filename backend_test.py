#!/usr/bin/env python3
"""
Backend API Testing for Satya Healthcare System
Tests all main API endpoints for the healthcare authorization system
"""
import requests
import sys
import json
from datetime import datetime

class SatyaHealthcareAPITester:
    def __init__(self, base_url="https://provider-efficiency.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.auth_id = None
        self.rec_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: {len(response_data)} items returned")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            print(f"   ✅ Logged in as: {self.user_data.get('name', 'Unknown')} ({self.user_data.get('role', 'Unknown role')})")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        return self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test(
            "Dashboard Statistics",
            "GET",
            "dashboard/stats",
            200
        )

    def test_list_authorizations(self):
        """Test list authorizations"""
        return self.run_test(
            "List Authorizations",
            "GET",
            "authorizations",
            200
        )

    def test_create_authorization(self):
        """Test create new authorization"""
        auth_data = {
            "guide_number": f"TEST-{int(datetime.now().timestamp())}",
            "beneficiary_hash": f"BEN-{int(datetime.now().timestamp())}",
            "beneficiary_name_hash": f"NAME-{int(datetime.now().timestamp())}",
            "plan_code": "TEST-PLAN",
            "plan_name": "Plano de Teste",
            "specialty": "Cardiologia",
            "city": "São Paulo",
            "state": "SP",
            "estimated_cost": 1500.00,
            "items": [
                {
                    "procedure_code": "40301012",
                    "procedure_name": "Consulta cardiológica",
                    "quantity": 1,
                    "unit_price": 150.00,
                    "total_price": 150.00
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Authorization",
            "POST",
            "authorizations",
            200,  # Backend returns 200, not 201
            data=auth_data
        )
        
        if success and 'id' in response:
            self.auth_id = response['id']
            print(f"   ✅ Authorization created with ID: {self.auth_id}")
            return True
        return False

    def test_get_authorization(self):
        """Test get specific authorization"""
        if not self.auth_id:
            print("⚠️  Skipping - No authorization ID available")
            return True
            
        return self.run_test(
            "Get Authorization",
            "GET",
            f"authorizations/{self.auth_id}",
            200
        )

    def test_generate_recommendation(self):
        """Test generate recommendation for authorization"""
        if not self.auth_id:
            print("⚠️  Skipping - No authorization ID available")
            return True
            
        success, response = self.run_test(
            "Generate Recommendation",
            "POST",
            "recommendations",
            200,  # Backend returns 200, not 201
            data={"authorization_id": self.auth_id}
        )
        
        if success and 'id' in response:
            self.rec_id = response['id']
            print(f"   ✅ Recommendation generated with ID: {self.rec_id}")
            return True
        return False

    def test_list_recommendations(self):
        """Test list recommendations"""
        return self.run_test(
            "List Recommendations",
            "GET",
            "recommendations",
            200
        )

    def test_get_recommendation(self):
        """Test get specific recommendation"""
        if not self.rec_id:
            print("⚠️  Skipping - No recommendation ID available")
            return True
            
        return self.run_test(
            "Get Recommendation",
            "GET",
            f"recommendations/{self.rec_id}",
            200
        )

    def test_list_providers(self):
        """Test list providers"""
        return self.run_test(
            "List Providers",
            "GET",
            "providers",
            200
        )

    def test_list_providers_with_filters(self):
        """Test list providers with specialty filter"""
        return self.run_test(
            "List Providers (Cardiologia)",
            "GET",
            "providers?specialty=Cardiologia",
            200
        )

    def test_get_tenant_config(self):
        """Test get tenant configuration"""
        return self.run_test(
            "Get Tenant Config",
            "GET",
            "config",
            200
        )

def main():
    """Main test execution"""
    print("=" * 60)
    print("🏥 Satya Healthcare API Testing")
    print("=" * 60)
    
    tester = SatyaHealthcareAPITester()
    
    # Test credentials from review request
    test_email = "admin@saudetotal.com"
    test_password = "admin123"
    
    print(f"\n📧 Testing with credentials: {test_email}")
    
    # Run all tests in sequence
    test_results = []
    
    # Health check
    success, _ = tester.test_health_check()
    test_results.append(("Health Check", success))
    
    # Authentication flow
    if tester.test_login(test_email, test_password):
        test_results.append(("Login", True))
        
        # Get user info
        success, _ = tester.test_get_me()
        test_results.append(("Get Current User", success))
        
        # Dashboard stats
        success, _ = tester.test_dashboard_stats()
        test_results.append(("Dashboard Statistics", success))
        
        # Authorizations
        success, _ = tester.test_list_authorizations()
        test_results.append(("List Authorizations", success))
        
        # Create authorization
        if tester.test_create_authorization():
            test_results.append(("Create Authorization", True))
            
            # Get specific authorization
            success, _ = tester.test_get_authorization()
            test_results.append(("Get Authorization", success))
            
            # Generate recommendation
            if tester.test_generate_recommendation():
                test_results.append(("Generate Recommendation", True))
                
                # Get specific recommendation
                success, _ = tester.test_get_recommendation()
                test_results.append(("Get Recommendation", success))
            else:
                test_results.append(("Generate Recommendation", False))
                test_results.append(("Get Recommendation", False))
        else:
            test_results.append(("Create Authorization", False))
            test_results.append(("Get Authorization", False))
            test_results.append(("Generate Recommendation", False))
            test_results.append(("Get Recommendation", False))
        
        # Recommendations list
        success, _ = tester.test_list_recommendations()
        test_results.append(("List Recommendations", success))
        
        # Providers
        success, _ = tester.test_list_providers()
        test_results.append(("List Providers", success))
        
        success, _ = tester.test_list_providers_with_filters()
        test_results.append(("List Providers (Filtered)", success))
        
        # Config
        success, _ = tester.test_get_tenant_config()
        test_results.append(("Get Tenant Config", success))
        
    else:
        test_results.append(("Login", False))
        print("\n❌ Login failed, skipping authenticated tests")
        return 1

    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, success in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status:<8} {test_name}")
        if success:
            passed += 1
    
    print("-" * 60)
    print(f"📈 Overall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! Backend APIs are working correctly.")
        return 0
    else:
        print(f"⚠️  {total-passed} tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())