import importlib.util
import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from werkzeug.security import check_password_hash, generate_password_hash

app_spec = importlib.util.spec_from_file_location(
    "glamride_legacy_app", Path(__file__).with_name("app.py")
)
if app_spec is None or app_spec.loader is None:
    raise ImportError("Could not load the legacy backend app for its API tests.")
legacy_app = importlib.util.module_from_spec(app_spec)
sys.modules[app_spec.name] = legacy_app
app_spec.loader.exec_module(legacy_app)
with legacy_app.app.app_context():
    legacy_app.db.engine.dispose()

Admin = legacy_app.Admin
Booking = legacy_app.Booking
Service = legacy_app.Service
Stylist = legacy_app.Stylist
StylistAccount = legacy_app.StylistAccount
create_app = legacy_app.create_app
db = legacy_app.db
seed_database = legacy_app.seed_database


class GlamRideApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "test-key",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )
        self.client = self.app.test_client()
        with self.app.app_context():
            db.session.add(
                Admin(
                    name="Test Admin",
                    email="admin@example.com",
                    password_hash=generate_password_hash("test-admin-password"),
                )
            )
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def register_customer(self, email="customer@example.com"):
        response = self.client.post(
            "/api/register",
            json={
                "name": "Test Customer",
                "email": email,
                "phone": "0712345678",
                "password": "customer-password",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response

    def register_stylist(self):
        response = self.client.post(
            "/api/stylist/register",
            json={
                "name": "Test Stylist",
                "email": "stylist@example.com",
                "phone": "0712345679",
                "password": "stylist-password",
                "location": "Westlands, Nairobi",
                "specialties": "Braids",
                "bio": "A test stylist profile.",
                "offers_home_visit": True,
                "offers_salon": True,
            },
        )
        self.assertEqual(response.status_code, 201)
        with self.app.app_context():
            return StylistAccount.query.filter_by(email="stylist@example.com").first().stylist_id

    def login(self, role, email, password):
        return self.client.post(
            "/api/login",
            json={"role": role, "email": email, "password": password},
        )

    def test_admin_password_can_be_reset_interactively(self):
        result = self.app.test_cli_runner().invoke(
            args=["reset-admin-password"],
            input="admin@example.com\nnew-admin-password\nnew-admin-password\n",
        )

        self.assertEqual(result.exit_code, 0, result.output)
        self.assertIn("Administrator password updated.", result.output)
        with self.app.app_context():
            admin = Admin.query.filter_by(email="admin@example.com").one()
            self.assertTrue(check_password_hash(admin.password_hash, "new-admin-password"))
        self.assertEqual(
            self.login("admin", "admin@example.com", "new-admin-password").status_code,
            200,
        )

    def create_booking(self, stylist_id=None):
        if stylist_id is None:
            with self.app.app_context():
                stylist_id = Stylist.query.filter_by(is_approved=True).first().id
        with self.app.app_context():
            service_id = Service.query.order_by(Service.id).first().id
        response = self.client.post(
            "/api/bookings",
            json={
                "stylist_id": stylist_id,
                "service_id": service_id,
                "scheduled_date": (datetime.now() + timedelta(days=2)).replace(microsecond=0).isoformat(),
                "booking_type": "home",
                "location": "Westlands, Nairobi",
                "payment_method": "mpesa",
                "notes": "Please call when you arrive.",
            },
        )
        return response

    def test_services_are_seeded_and_filterable(self):
        response = self.client.get("/api/services?category=Braids")

        self.assertEqual(response.status_code, 200)
        services = response.get_json()
        self.assertTrue(services)
        self.assertTrue(all(service["category"] == "Braids" for service in services))

    def test_service_seed_adds_catalog_without_replacing_existing_services(self):
        with self.app.app_context():
            existing = Service.query.filter_by(name="Knotless braids").first()
            existing_id = existing.id
            db.session.add(
                Service(
                    name="Existing custom service",
                    category="Custom",
                    description="A service already in the database.",
                    icon="",
                    base_price=1000,
                    duration_minutes=30,
                )
            )
            db.session.commit()

            seed_database()

            self.assertEqual(Service.query.filter_by(name="Knotless braids").one().id, existing_id)
            self.assertEqual(Service.query.filter_by(name="Existing custom service").count(), 1)
            self.assertEqual(Service.query.filter_by(name="Bridal makeup").count(), 1)
            self.assertEqual(Service.query.filter_by(name="Gel manicure").count(), 1)

    def test_stylists_can_be_searched_by_location(self):
        response = self.client.get("/api/stylists?location=Westlands")

        self.assertEqual(response.status_code, 200)
        stylists = response.get_json()
        self.assertEqual(len(stylists), 1)
        self.assertEqual(stylists[0]["name"], "Nia Wanjiku")

    def test_nearby_search_returns_only_opted_in_stylists_in_distance_order(self):
        with self.app.app_context():
            nia = Stylist.query.filter_by(name="Nia Wanjiku").first()
            amani = Stylist.query.filter_by(name="Amani Otieno").first()
            nia.latitude, nia.longitude = -1.2800, 36.8200
            amani.latitude, amani.longitude = -1.3000, 36.8200
            db.session.commit()

        response = self.client.get(
            "/api/stylists?latitude=-1.281&longitude=36.82&radius_km=10"
        )

        self.assertEqual(response.status_code, 200)
        results = response.get_json()
        self.assertEqual([result["name"] for result in results], ["Nia Wanjiku", "Amani Otieno"])
        self.assertGreaterEqual(results[0]["distance_km"], 0)
        self.assertNotIn("latitude", results[0])
        self.assertTrue(results[0]["has_gps_location"])

    def test_nearby_search_rejects_invalid_coordinates_and_radius(self):
        self.assertEqual(
            self.client.get("/api/stylists?latitude=91&longitude=36").status_code,
            400,
        )
        self.assertEqual(
            self.client.get("/api/stylists?latitude=-1&longitude=36&radius_km=101").status_code,
            400,
        )
        self.assertEqual(
            self.client.get("/api/stylists?latitude=-1").status_code,
            400,
        )

    def test_stylist_can_opt_in_to_gps_after_admin_approval(self):
        stylist_id = self.register_stylist()
        self.client.post("/api/logout")
        self.login("admin", "admin@example.com", "test-admin-password")
        approval = self.client.patch(
            f"/api/admin/stylists/{stylist_id}", json={"is_approved": True}
        )
        self.assertEqual(approval.status_code, 200)

        self.client.post("/api/logout")
        self.login("stylist", "stylist@example.com", "stylist-password")
        location = self.client.patch(
            "/api/stylist/location",
            json={"latitude": -1.2800, "longitude": 36.8200},
        )
        self.assertEqual(location.status_code, 200, location.get_json())

        profile = next(
            stylist
            for stylist in self.client.get("/api/stylists").get_json()
            if stylist["id"] == stylist_id
        )
        self.assertTrue(profile["has_gps_location"])
        self.assertNotIn("latitude", profile)

        nearby = self.client.get(
            "/api/stylists?latitude=-1.281&longitude=36.82&radius_km=5"
        )
        self.assertEqual(nearby.status_code, 200)
        self.assertEqual(nearby.get_json()[0]["id"], stylist_id)
        self.assertLess(nearby.get_json()[0]["distance_km"], 1)

    def test_unknown_stylist_returns_json_404(self):
        response = self.client.get("/api/stylists/9999")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Stylist not found."})

    def test_customer_registration_login_and_logout(self):
        response = self.register_customer()
        self.assertEqual(response.get_json()["role"], "customer")
        self.assertEqual(self.client.get("/api/me").get_json()["email"], "customer@example.com")

        self.client.post("/api/logout")
        self.assertEqual(self.client.get("/api/me").status_code, 401)
        self.assertEqual(
            self.login("customer", "customer@example.com", "customer-password").status_code,
            200,
        )
        self.assertEqual(
            self.login("customer", "customer@example.com", "incorrect-password").status_code,
            401,
        )

    def test_booking_is_private_and_demo_payment_is_explicit(self):
        self.register_customer()
        response = self.create_booking()

        self.assertEqual(response.status_code, 201, response.get_json())
        booking_id = response.get_json()["id"]
        payment = self.client.post(f"/api/bookings/{booking_id}/demo-payment")
        self.assertEqual(payment.status_code, 200)
        self.assertIn("No money was charged", payment.get_json()["message"])
        self.assertEqual(payment.get_json()["booking"]["payment_status"], "demo_paid")

        self.client.post("/api/logout")
        self.register_customer("another@example.com")
        self.assertEqual(self.client.get("/api/bookings").get_json(), [])
        self.assertEqual(
            self.client.patch(
                f"/api/bookings/{booking_id}/status", json={"status": "cancelled"}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(f"/api/bookings/{booking_id}/demo-payment").status_code,
            404,
        )

    def test_customer_cannot_book_in_the_past(self):
        self.register_customer()
        response = self.client.post(
            "/api/bookings",
            json={
                "stylist_id": 1,
                "service_id": 1,
                "scheduled_date": (datetime.now() - timedelta(days=1)).isoformat(),
                "booking_type": "home",
                "location": "Nairobi",
                "payment_method": "cash",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("future", response.get_json()["error"])

    def test_gps_booking_pin_is_shared_only_with_booking_participants(self):
        self.register_customer()
        with self.app.app_context():
            nia = Stylist.query.filter_by(name="Nia Wanjiku").first()
            db.session.add(
                StylistAccount(
                    stylist_id=nia.id,
                    email="nia@example.com",
                    phone="0712345000",
                    password_hash=generate_password_hash("nia-password"),
                )
            )
            db.session.commit()
        response = self.client.post(
            "/api/bookings",
            json={
                "stylist_id": 1,
                "service_id": 1,
                "scheduled_date": (datetime.now() + timedelta(days=2)).isoformat(),
                "booking_type": "home",
                "location": "Customer-shared GPS location",
                "latitude": -1.2921,
                "longitude": 36.8219,
                "payment_method": "mpesa",
            },
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        booking_id = response.get_json()["id"]
        self.assertEqual(response.get_json()["latitude"], -1.2921)

        self.client.post("/api/logout")
        self.register_customer("another@example.com")
        self.assertEqual(self.client.get("/api/bookings").get_json(), [])
        self.assertEqual(
            self.client.post(f"/api/bookings/{booking_id}/demo-payment").status_code,
            404,
        )

        self.client.post("/api/logout")
        self.login("stylist", "nia@example.com", "nia-password")
        stylist_bookings = self.client.get("/api/bookings").get_json()
        self.assertEqual(len(stylist_bookings), 1)
        self.assertEqual(stylist_bookings[0]["latitude"], -1.2921)
        public_profiles = self.client.get("/api/stylists").get_json()
        self.assertTrue(all("latitude" not in profile for profile in public_profiles))

    def test_complete_booking_can_be_reviewed_only_once_by_its_customer(self):
        self.register_customer()
        stylist_id = self.register_stylist()
        self.assertNotIn(
            stylist_id,
            [stylist["id"] for stylist in self.client.get("/api/stylists").get_json()],
        )
        self.client.post("/api/logout")
        self.login("admin", "admin@example.com", "test-admin-password")
        approved = self.client.patch(
            f"/api/admin/stylists/{stylist_id}", json={"is_approved": True}
        )
        self.assertEqual(approved.status_code, 200)
        self.assertIn(
            stylist_id,
            [stylist["id"] for stylist in self.client.get("/api/stylists").get_json()],
        )

        self.client.post("/api/logout")
        self.login("customer", "customer@example.com", "customer-password")
        booking = self.create_booking(stylist_id)
        self.assertEqual(booking.status_code, 201, booking.get_json())
        booking_id = booking.get_json()["id"]

        self.assertEqual(
            self.client.post(
                f"/api/bookings/{booking_id}/reviews",
                json={"rating": 5, "comment": "Lovely work."},
            ).status_code,
            400,
        )

        self.client.post("/api/logout")
        self.login("stylist", "stylist@example.com", "stylist-password")
        for status in ("accepted", "in_progress", "completed"):
            result = self.client.patch(
                f"/api/bookings/{booking_id}/status", json={"status": status}
            )
            self.assertEqual(result.status_code, 200, result.get_json())

        self.client.post("/api/logout")
        self.login("customer", "customer@example.com", "customer-password")
        review = self.client.post(
            f"/api/bookings/{booking_id}/reviews",
            json={"rating": 5, "comment": "Lovely work."},
        )
        self.assertEqual(review.status_code, 201, review.get_json())
        self.assertEqual(
            self.client.post(
                f"/api/bookings/{booking_id}/reviews",
                json={"rating": 4, "comment": "Another review."},
            ).status_code,
            409,
        )
        with self.app.app_context():
            reviewed_stylist = db.session.get(Stylist, stylist_id)
            self.assertEqual(reviewed_stylist.total_reviews, 1)
            self.assertEqual(reviewed_stylist.rating, 5)

    def test_stylist_dashboard_and_admin_dashboard_require_their_roles(self):
        self.assertEqual(self.client.get("/api/admin/dashboard").status_code, 401)
        self.assertEqual(self.client.get("/api/stylist/dashboard").status_code, 401)
        self.assertEqual(
            self.client.patch(
                "/api/bookings/999/status", json={"status": "cancelled"}
            ).status_code,
            401,
        )
        self.register_customer()
        self.assertEqual(self.client.get("/api/admin/dashboard").status_code, 401)
        self.assertEqual(self.client.get("/api/stylist/dashboard").status_code, 401)

    def test_admin_can_load_the_dashboard(self):
        self.login("admin", "admin@example.com", "test-admin-password")

        response = self.client.get("/api/admin/dashboard")

        self.assertEqual(response.status_code, 200, response.get_json())
        dashboard = response.get_json()
        self.assertEqual(
            set(dashboard),
            {"stats", "pending_stylists", "bookings"},
        )
        self.assertIn("customers", dashboard["stats"])
        self.assertIsInstance(dashboard["pending_stylists"], list)
        self.assertIsInstance(dashboard["bookings"], list)

    def test_admin_decline_removes_application_from_pending_queue(self):
        stylist_id = self.register_stylist()
        self.login("admin", "admin@example.com", "test-admin-password")

        decline = self.client.patch(
            f"/api/admin/stylists/{stylist_id}",
            json={"is_approved": False},
        )
        dashboard = self.client.get("/api/admin/dashboard")

        self.assertEqual(decline.status_code, 200, decline.get_json())
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.get_json()["pending_stylists"], [])
        with self.app.app_context():
            stylist = db.session.get(Stylist, stylist_id)
            self.assertEqual(stylist.application_status, "declined")
        self.login("stylist", "stylist@example.com", "stylist-password")
        stylist_dashboard = self.client.get("/api/stylist/dashboard")
        self.assertEqual(stylist_dashboard.status_code, 200)
        self.assertEqual(stylist_dashboard.get_json()["application_status"], "declined")

    def test_booking_chat_and_live_location_are_private_to_participants(self):
        self.register_customer()
        stylist_id = self.register_stylist()
        self.client.post("/api/logout")
        self.login("admin", "admin@example.com", "test-admin-password")
        approved = self.client.patch(
            f"/api/admin/stylists/{stylist_id}",
            json={"is_approved": True},
        )
        self.assertEqual(approved.status_code, 200, approved.get_json())

        self.client.post("/api/logout")
        self.login("customer", "customer@example.com", "customer-password")
        booking_response = self.create_booking(stylist_id)
        self.assertEqual(booking_response.status_code, 201, booking_response.get_json())
        booking = booking_response.get_json()
        self.assertEqual(booking["duration_minutes"], 240)
        self.assertEqual(booking["notes"], "Please call when you arrive.")
        self.assertEqual(booking["payment_method"], "mpesa")
        booking_id = booking["id"]
        self.client.post("/api/logout")
        self.assertEqual(self.client.get(f"/api/bookings/{booking_id}/messages").status_code, 401)
        self.login("customer", "customer@example.com", "customer-password")

        self.assertEqual(
            self.client.post(
                f"/api/bookings/{booking_id}/live-location",
                json={"latitude": -1.28, "longitude": 36.82},
            ).status_code,
            409,
        )
        empty_message = self.client.post(
            f"/api/bookings/{booking_id}/messages",
            json={"message": "  "},
        )
        self.assertEqual(empty_message.status_code, 400)
        sent = self.client.post(
            f"/api/bookings/{booking_id}/messages",
            json={"message": "Please call when you arrive."},
        )
        self.assertEqual(sent.status_code, 201, sent.get_json())

        self.login("stylist", "stylist@example.com", "stylist-password")
        conversation = self.client.get(f"/api/bookings/{booking_id}/messages")
        self.assertEqual(conversation.status_code, 200)
        self.assertEqual(conversation.get_json()["messages"][0]["message"], "Please call when you arrive.")
        accepted = self.client.patch(
            f"/api/bookings/{booking_id}/status",
            json={"status": "accepted"},
        )
        self.assertEqual(accepted.status_code, 200, accepted.get_json())
        shared = self.client.post(
            f"/api/bookings/{booking_id}/live-location",
            json={"latitude": -1.28, "longitude": 36.82},
        )
        self.assertEqual(shared.status_code, 200, shared.get_json())
        self.assertIsNotNone(shared.get_json()["live_locations"]["stylist"])

        other_customer = self.client.post(
            "/api/register",
            json={
                "name": "Another Customer",
                "email": "another-customer@example.com",
                "phone": "0712345680",
                "password": "another-password",
            },
        )
        self.assertEqual(other_customer.status_code, 201, other_customer.get_json())
        forbidden = self.client.get(f"/api/bookings/{booking_id}/messages")
        self.assertEqual(forbidden.status_code, 403)
        forbidden_location = self.client.post(
            f"/api/bookings/{booking_id}/live-location",
            json={"latitude": -1.28, "longitude": 36.82},
        )
        self.assertEqual(forbidden_location.status_code, 403)

        self.login("customer", "customer@example.com", "customer-password")
        conversation = self.client.get(f"/api/bookings/{booking_id}/messages")
        self.assertIsNotNone(conversation.get_json()["live_locations"]["stylist"])
        self.assertEqual(
            self.client.post(
                f"/api/bookings/{booking_id}/live-location",
                json={"latitude": 91, "longitude": 36.82},
            ).status_code,
            400,
        )
        customer_shared = self.client.post(
            f"/api/bookings/{booking_id}/live-location",
            json={"latitude": -1.29, "longitude": 36.81},
        )
        self.assertEqual(customer_shared.status_code, 200, customer_shared.get_json())
        self.assertIsNotNone(customer_shared.get_json()["live_locations"]["customer"])

        stopped = self.client.delete(f"/api/bookings/{booking_id}/live-location")
        self.assertEqual(stopped.status_code, 200, stopped.get_json())
        self.assertIsNone(stopped.get_json()["live_locations"]["customer"])
        self.assertIsNotNone(stopped.get_json()["live_locations"]["stylist"])
        self.client.post(
            f"/api/bookings/{booking_id}/live-location",
            json={"latitude": -1.29, "longitude": 36.81},
        )
        self.login("admin", "admin@example.com", "test-admin-password")
        admin_booking = self.client.get("/api/bookings").get_json()[0]
        self.assertEqual(
            admin_booking["live_locations"],
            {"customer": None, "stylist": None},
        )

        self.login("stylist", "stylist@example.com", "stylist-password")
        self.assertEqual(
            self.client.patch(
                f"/api/bookings/{booking_id}/status",
                json={"status": "in_progress"},
            ).status_code,
            200,
        )
        completed = self.client.patch(
            f"/api/bookings/{booking_id}/status",
            json={"status": "completed"},
        )
        self.assertEqual(completed.status_code, 200, completed.get_json())
        self.assertIsNone(completed.get_json()["live_locations"]["customer"])
        self.assertIsNone(completed.get_json()["live_locations"]["stylist"])


if __name__ == "__main__":
    unittest.main()
