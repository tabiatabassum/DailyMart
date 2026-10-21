import os

import pymysql
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import uuid
from werkzeug.utils import secure_filename
from flask import send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt,
)

load_dotenv()

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

if not app.config["JWT_SECRET_KEY"]:
    raise RuntimeError("JWT_SECRET_KEY is missing from .env")

jwt = JWTManager(app)

CORS(app)
UPLOAD_FOLDER = os.path.join(app.root_path, "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024


def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "dailymart"),
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5
    )
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Admin access required."}), 403

        return fn(*args, **kwargs)

    return wrapper

def convert_product(product):
    """Convert database values into JSON-friendly values."""
    if product.get("price") is not None:
        product["price"] = float(product["price"])

    if product.get("old_price") is not None:
        product["old_price"] = float(product["old_price"])

    if product.get("created_at") is not None:
        product["created_at"] = product["created_at"].isoformat()

    return product


def validate_product(data, creating=False):
    """Validate product fields received from the Admin Panel."""
    if not isinstance(data, dict):
        return None, "Product data must be a JSON object."

    if creating:
        for field in ("name", "category", "price"):
            if field not in data or data[field] in (None, ""):
                return None, f"{field} is required."

    fields = {
        "name": data.get("name"),
        "category": data.get("category"),
        "subcategory": data.get("subcategory"),
        "price": data.get("price"),
        "old_price": data.get("old_price", data.get("oldPrice")),
        "unit": data.get("unit"),
        "stock": data.get("stock", 0 if creating else None),
        "image": data.get("image"),
        "badge": data.get("badge")
    }

    # Only include fields actually supplied for an update.
    allowed = {
        "name", "category", "subcategory", "price",
        "old_price", "oldPrice", "unit", "stock",
        "image", "badge"
    }

    result = {}

    for key in allowed:
        if key in data:
            db_key = "old_price" if key == "oldPrice" else key
            result[db_key] = fields[db_key]

    if creating and "old_price" not in result:
        result["old_price"] = None

    if creating:
        result.setdefault("subcategory", None)
        result.setdefault("unit", None)
        result.setdefault("image", None)
        result.setdefault("badge", None)
        result.setdefault("stock", 0)

    for field in ("name", "category"):
        if field in result:
            if not isinstance(result[field], str) or not result[field].strip():
                return None, f"{field} must not be empty."
            result[field] = result[field].strip()

    for field in ("price", "old_price"):
        if field in result:
            value = result[field]

            if value in (None, "") and field == "old_price":
                result[field] = None
                continue

            try:
                result[field] = float(value)
            except (TypeError, ValueError):
                return None, f"{field} must be a valid number."

            if result[field] < 0:
                return None, f"{field} cannot be negative."

    if "stock" in result:
        try:
            stock = int(result["stock"])
            if str(result["stock"]).strip() != str(stock):
                # Accept numeric values such as 5.0, but not 5.5.
                if float(result["stock"]) != stock:
                    return None, "stock must be a whole number."
            result["stock"] = stock
        except (TypeError, ValueError):
            return None, "stock must be a whole number."

        if result["stock"] < 0:
            return None, "stock cannot be negative."

    for field in ("subcategory", "unit", "image", "badge"):
        if field in result and result[field] == "":
            result[field] = None

    return result, None


@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to DailyMart API!",
        "status": "running"
    })

# Upload an image selected from a computer or mobile device
@app.route("/api/upload-image", methods=["POST"])
@admin_required
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "Please select an image."}), 400

    image = request.files["image"]

    if not image.filename:
        return jsonify({"error": "No image was selected."}), 400

    original_name = secure_filename(image.filename)
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Use a PNG, JPG, JPEG or WEBP image."
        }), 400

    filename = f"{uuid.uuid4().hex}.{extension}"
    image.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

    return jsonify({
        "message": "Image uploaded successfully.",
        "image": f"/uploads/{filename}"
    }), 201


# Display an uploaded image
@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_uploaded_image(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)
# GET: Retrieve all products
@app.route("/api/products", methods=["GET"])
def get_products():
    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM products ORDER BY id")
            products = cursor.fetchall()

        return jsonify([convert_product(p) for p in products])

    except Exception:
        app.logger.exception("Could not retrieve products")
        return jsonify({"error": "Could not retrieve products."}), 500

    finally:
        if connection is not None:
            connection.close()


# POST: Add a new product
@app.route("/api/products", methods=["POST"])
@admin_required
def add_product():
    data, error = validate_product(request.get_json(silent=True), creating=True)

    if error:
        return jsonify({"error": error}), 400

    connection = None

    try:
        connection = get_db_connection()

        columns = list(data.keys())
        column_names = ", ".join(f"`{column}`" for column in columns)
        placeholders = ", ".join(["%s"] * len(columns))

        with connection.cursor() as cursor:
            sql = (
                f"INSERT INTO products ({column_names}) "
                f"VALUES ({placeholders})"
            )
            cursor.execute(sql, [data[column] for column in columns])
            product_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Product added successfully.",
            "id": product_id
        }), 201

    except Exception:
        if connection is not None:
            connection.rollback()
        app.logger.exception("Could not add product")
        return jsonify({"error": "Could not add product. Check the backend terminal."}), 500

    finally:
        if connection is not None:
            connection.close()


# PUT: Update an existing product
@app.route("/api/products/<int:product_id>", methods=["PUT"])
@admin_required
def update_product(product_id):
    data, error = validate_product(request.get_json(silent=True))

    if error:
        return jsonify({"error": error}), 400

    if not data:
        return jsonify({"error": "No product fields were provided."}), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM products WHERE id = %s",
                (product_id,)
            )

            if cursor.fetchone() is None:
                return jsonify({"error": "Product not found."}), 404

            assignments = ", ".join(
                f"`{column}` = %s" for column in data.keys()
            )

            sql = f"UPDATE products SET {assignments} WHERE id = %s"
            values = list(data.values()) + [product_id]

            cursor.execute(sql, values)

        connection.commit()

        return jsonify({
            "message": "Product updated successfully.",
            "id": product_id
        })

    except Exception:
        if connection is not None:
            connection.rollback()
        app.logger.exception("Could not update product")
        return jsonify({"error": "Could not update product. Check the backend terminal."}), 500

    finally:
        if connection is not None:
            connection.close()


# DELETE: Delete an existing product
@app.route("/api/products/<int:product_id>", methods=["DELETE"])
@admin_required
def delete_product(product_id):
    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM products WHERE id = %s",
                (product_id,)
            )

            if cursor.rowcount == 0:
                return jsonify({"error": "Product not found."}), 404

        connection.commit()

        return jsonify({"message": "Product deleted successfully."})

    except Exception:
        if connection is not None:
            connection.rollback()
        app.logger.exception("Could not delete product")
        return jsonify({"error": "Could not delete product. Check the backend terminal."}), 500

    finally:
        if connection is not None:
            connection.close()


# POST: Place a new customer order
@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid order data."}), 400

    customer_name = data.get("customer_name")
    phone = data.get("phone")
    address = data.get("address")
    payment_method = data.get("payment_method", "Cash on Delivery")
    items = data.get("items")

    if not all(
        isinstance(value, str) and value.strip()
        for value in (customer_name, phone, address)
    ):
        return jsonify({
            "error": "Customer name, phone and address are required."
        }), 400

    if len(customer_name.strip()) > 100 or len(phone.strip()) > 20:
        return jsonify({"error": "Name or phone number is too long."}), 400

    if payment_method != "Cash on Delivery":
        return jsonify({
            "error": "Currently, only Cash on Delivery is supported."
        }), 400

    if not isinstance(items, list) or not items:
        return jsonify({"error": "Your cart is empty."}), 400

    # Validate and combine duplicate product IDs.
    quantities = {}

    for item in items:
        if not isinstance(item, dict):
            return jsonify({"error": "Invalid cart item."}), 400

        product_id = item.get("product_id")
        quantity = item.get("quantity")

        if (
            isinstance(product_id, bool)
            or not isinstance(product_id, int)
            or product_id <= 0
            or isinstance(quantity, bool)
            or not isinstance(quantity, int)
            or quantity <= 0
        ):
            return jsonify({
                "error": "Product ID and quantity must be positive integers."
            }), 400

        quantities[product_id] = quantities.get(product_id, 0) + quantity

    connection = None

    try:
        from decimal import Decimal

        connection = get_db_connection()
        total_amount = Decimal("0.00")
        order_items = []

        with connection.cursor() as cursor:
            # Lock products while checking stock and creating the order.
            for product_id, quantity in sorted(quantities.items()):
                cursor.execute(
                    """
                    SELECT id, name, price, stock
                    FROM products
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (product_id,)
                )
                product = cursor.fetchone()

                if product is None:
                    connection.rollback()
                    return jsonify({
                        "error": f"Product ID {product_id} was not found."
                    }), 400

                if product["stock"] is None or product["stock"] < quantity:
                    connection.rollback()
                    return jsonify({
                        "error": f"Not enough stock for {product['name']}."
                    }), 400

                price = Decimal(str(product["price"]))
                total_amount += price * quantity

                order_items.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": quantity,
                    "price": price
                })

            cursor.execute(
                """
                INSERT INTO orders
                    (customer_name, phone, address, total_amount,
                     payment_method, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    customer_name.strip(),
                    phone.strip(),
                    address.strip(),
                    total_amount,
                    payment_method,
                    "Pending"
                )
            )
            order_id = cursor.lastrowid

            for item in order_items:
                cursor.execute(
                    """
                    INSERT INTO order_items
                        (order_id, product_id, product_name, quantity, price)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        order_id,
                        item["product_id"],
                        item["product_name"],
                        item["quantity"],
                        item["price"]
                    )
                )

                cursor.execute(
                    """
                    UPDATE products
                    SET stock = stock - %s
                    WHERE id = %s
                    """,
                    (item["quantity"], item["product_id"])
                )

        connection.commit()

        return jsonify({
            "message": "Order placed successfully.",
            "order_id": order_id,
            "total_amount": float(total_amount),
            "status": "Pending"
        }), 201

    except Exception:
        if connection is not None:
            connection.rollback()

        app.logger.exception("Could not create order")
        return jsonify({
            "error": "Could not place order. Please try again."
        }), 500

    finally:
        if connection is not None:
            connection.close()

@app.route("/api/orders", methods=["GET"])
def get_orders():
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT *
                FROM orders
                ORDER BY created_at DESC
            """)
            orders = cursor.fetchall()

            for order in orders:
                cursor.execute("""
                    SELECT product_name, quantity, price
                    FROM order_items
                    WHERE order_id = %s
                """, (order["id"],))

                order["items"] = cursor.fetchall()

                # Convert database decimal values to JSON-friendly numbers
                order["total_amount"] = float(order["total_amount"])

                for item in order["items"]:
                    item["price"] = float(item["price"])

        return jsonify(orders), 200

    except Exception as error:
        return jsonify({"error": str(error)}), 500

    finally:
        connection.close()


@app.route("/api/orders/<int:order_id>", methods=["PUT"])
@admin_required
def update_order_status(order_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    allowed_statuses = [
        "Pending",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Delivered"
    ]

    if status not in allowed_statuses:
        return jsonify({"error": "Invalid order status."}), 400

    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM orders WHERE id = %s",
                (order_id,)
            )

            if not cursor.fetchone():
                return jsonify({"error": "Order not found."}), 404

            cursor.execute("""
                UPDATE orders
                SET status = %s
                WHERE id = %s
            """, (status, order_id))

        connection.commit()

        return jsonify({
            "message": "Order status updated successfully.",
            "order_id": order_id,
            "status": status
        }), 200

    except Exception as error:
        connection.rollback()
        return jsonify({"error": str(error)}), 500

    finally:
        connection.close()

# POST: Register a new customer
@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid registration data."}), 400

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone", "")
    password = data.get("password")

    if not all(
        isinstance(value, str)
        for value in (name, email, phone, password)
    ):
        return jsonify({"error": "Invalid registration details."}), 400

    name = name.strip()
    email = email.strip().lower()
    phone = phone.strip()

    if not name or not email or not password:
        return jsonify({
            "error": "Name, email and password are required."
        }), 400

    if len(name) > 100 or len(email) > 255 or len(phone) > 20:
        return jsonify({"error": "One or more fields are too long."}), 400

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        return jsonify({"error": "Please enter a valid email address."}), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must be at least 8 characters."
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (name, email, phone, password_hash)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    name,
                    email,
                    phone or None,
                    generate_password_hash(password)
                )
            )
            user_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Registration successful.",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        }), 201

    except pymysql.err.IntegrityError:
        if connection is not None:
            connection.rollback()
        return jsonify({
            "error": "This email is already registered."
        }), 409

    except Exception:
        if connection is not None:
            connection.rollback()
        app.logger.exception("Registration failed")
        return jsonify({
            "error": "Registration failed. Please try again."
        }), 500

    finally:
        if connection is not None:
            connection.close()


# POST: Log in an existing customer
@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid login data."}), 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({
            "error": "Email and password are required."
        }), 400

    email = email.strip().lower()

    if not email or not password:
        return jsonify({
            "error": "Email and password are required."
        }), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, email, password_hash
                FROM users
                WHERE email = %s
                """,
                (email,)
            )
            user = cursor.fetchone()

        if not user or not check_password_hash(
            user["password_hash"], password
        ):
            return jsonify({
                "error": "Incorrect email or password."
            }), 401

        return jsonify({
            "message": "Login successful.",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200

    except Exception:
        app.logger.exception("Login failed")
        return jsonify({
            "error": "Login failed. Please try again."
        }), 500

    finally:
        if connection is not None:
            connection.close()

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid login data."}), 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Email and password are required."}), 400

    email = email.strip().lower()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    connection = None

    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, email, password_hash
                FROM admins
                WHERE email = %s
                """,
                (email,)
            )
            admin = cursor.fetchone()

        if not admin or not check_password_hash(
            admin["password_hash"], password
        ):
            return jsonify({
                "error": "Incorrect email or password."
            }), 401

        token = create_access_token(
            identity=str(admin["id"]),
            additional_claims={"role": "admin"}
        )

        return jsonify({
            "message": "Admin login successful.",
            "access_token": token,
            "admin": {
                "id": admin["id"],
                "name": admin["name"],
                "email": admin["email"]
            }
        }), 200

    except Exception:
        app.logger.exception("Admin login failed")
        return jsonify({"error": "Admin login failed."}), 500

    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
