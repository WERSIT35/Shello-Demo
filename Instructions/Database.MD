# Shello – Database Architecture & Schema

# Recommended Database: MongoDB

## Why MongoDB?

For Shello, MongoDB is recommended because:

* Flexible schema (easy product variations)
* JSON-like documents (perfect with Node.js)
* Fast development cycle
* Easy Docker integration
* Horizontal scalability ready

MongoDB should run:

* Inside Docker
* Not publicly exposed
* With authentication enabled

---

# Database Structure Overview

Database Name: shello_db

Collections:

* users
* products
* orders

---

# 1. Users Collection

Purpose: Store customer and admin accounts

Fields:

* _id (ObjectId)
* name (String, required)
* lastName (String, required)
* email (String, required, unique)
* pinCode (String, required, unique, 6 digits)
* password (String, hashed)
* role ("user" | "admin")
* createdAt (Date)
* updatedAt (Date)

Security Rules:

* Password hashed using bcrypt
* Never return password in API responses
* Email indexed and unique

---

# 2. Products Collection

Purpose: Store phone cases for sale

Fields:

* _id (ObjectId)
* title (String, required)
* description (String)
* price (Number, required)
* stock (Number, required)
* images (Array of Strings)
* isActive (Boolean, default true)
* createdAt (Date)
* updatedAt (Date)

Security Rules:

* Only admin can create/update/delete
* Backend validates price and stock
* Do not trust frontend price

---

# 3. Orders Collection

Purpose: Store customer purchases

Fields:

* _id (ObjectId)
* userId (ObjectId, reference users)
* items (Array):

  * productId (ObjectId)
  * quantity (Number)
  * priceAtPurchase (Number)
* totalPrice (Number)
* shippingAddress (Object)

  * fullName
  * phone
  * addressLine
  * city
  * postalCode
  * country
* status ("pending" | "paid" | "shipped" | "delivered" | "cancelled")
* createdAt (Date)
* updatedAt (Date)

Security Rules:

* Backend recalculates totalPrice
* Backend verifies stock before confirming order
* Only admin can update status

---

# Indexing Strategy

users:

* email (unique index)
* pinCode (unique index)

products:

* title (text index for search)
* isActive (index)

orders:

* userId (index)
* status (index)
* createdAt (index)

---

# Data Relationships Strategy

MongoDB approach: Reference-based (not heavy embedding)

* Orders reference userId
* Orders reference productId
* Product details stored separately

This avoids data duplication and improves consistency.

---

# Backup & Security Strategy

* Daily automated backups
* Store backups off-server
* Use MongoDB authentication
* Use strong root credentials
* Restrict network access to internal Docker network only

---

# Future Scaling Plan

If traffic grows:

* Enable MongoDB replica set
* Add Redis for caching
* Use read replicas
* Move to managed MongoDB cluster if needed

---

This database structure is secure, scalable, and production-ready for a modern e-commerce platform.
