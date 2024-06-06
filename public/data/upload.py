import os
import json
# import requests

# URL of the HAPI FHIR server
# url = "https://fhir.sandbox.asushares.com/fhir"
url = "http://localhost:8080/fhir"

# Path to the current directory
directory = "originals"

# Set the headers
headers = {
    "Content-Type": "application/fhir+json"
}

# Function to validate and correct the status
def validate_and_correct_status(resource):
    if resource.get("resourceType") == "Observation" and resource.get("status") == "active":
        resource["status"] = "final"  # Change to a valid status value for Observation
    elif resource.get("resourceType") == "Procedure" and resource.get("status") == "active":
        resource["status"] = "completed"  # Change to a valid status value for Procedure
    # Add more conditions here for other resource types if needed
    return resource

# Function to ensure each entry has a valid request method and URL
def ensure_request_method(entry):
    if "request" not in entry:
        entry["request"] = {}

    if "method" not in entry["request"] or entry["request"]["method"] is None:
        # Determine the appropriate method (this is just an example, adjust as needed)
        if "id" in entry["resource"]:
            entry["request"]["method"] = "PUT"
            entry["request"]["url"] = f'{entry["resource"]["resourceType"]}/{entry["resource"]["id"]}'
        else:
            entry["request"]["method"] = "POST"
            entry["request"]["url"] = entry["resource"]["resourceType"]
    elif entry["request"]["method"].upper() not in ["POST", "PUT", "DELETE", "GET"]:
        raise ValueError(f"Invalid HTTP method: {entry['request']['method']}")

    return entry

# Iterate over all files in the specified directory
for filename in os.listdir(directory):
    if filename.endswith(".json"):  # Process only JSON files
        file_path = os.path.join(directory, filename)
        with open(file_path, 'r') as file:
            bundle_data = json.load(file)

            # Ensure the Bundle type is 'transaction' or 'batch'
            if bundle_data.get("resourceType") == "Bundle" and bundle_data.get("type") == "collection":
                # bundle_data["type"] = "batch"  # or "batch"
                bundle_data["type"] = "transaction"

            # Validate and correct the status in each entry
            for entry in bundle_data.get("entry", []):
                entry["resource"] = validate_and_correct_status(entry.get("resource", {}))
                entry = ensure_request_method(entry)

            write_path = os.path.join('.', filename)
            with open(write_path, 'w') as write_file:
                json.dump(bundle_data, write_file, indent=4)
            # # Make the POST request
            # response = requests.post(url, headers=headers, json=bundle_data)

            # # Check the response
            # if response.status_code in [200, 201]:  # 200 OK or 201 Created
            #     print(f"Successfully uploaded {filename}")
            # else:
            #     print(f"Failed to upload {filename}. Status code: {response.status_code}")
            #     print(response.text)
    else:
        print(f"Skipping non-JSON file: {filename}")
