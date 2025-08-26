from pymongo import MongoClient

# Change the URI if using MongoDB Atlas (cloud)
client = MongoClient("mongodb://localhost:27017/")

# List all databases
print("Databases:", client.list_database_names())

# Create/use student_app database
db = client["student_app"]

# Create/use students collection
collection = db["students"]

# Insert a test document
collection.insert_one({"name": "Test Student", "roll_no": "001"})

# Fetch all documents
for student in collection.find():
    print(student)
