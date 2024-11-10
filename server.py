import matplotlib
matplotlib.use('Agg')  # Use the non-GUI backend for rendering plots
from flask import Flask, request, jsonify, send_file, session
import cohere
import os
import uuid
import pandas as pd
import matplotlib.pyplot as plt
import re
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.secret_key = 'your_secret_key'  # Set a secret key for session encryption

# Initialize Cohere client (use your actual API key)
cohere_client = cohere.Client(os.getenv('COHERE_API_KEY'))

# Dictionary to store previous text by token
user_sessions = {}

@app.route('/')
def home():
    return "Welcome to the Novel Generator API. Use the /generate endpoint to submit a request."

@app.route('/generate', methods=['POST'])
def generate_novel():
    token = request.headers.get('Token')
    if not token:
        token = str(uuid.uuid4())  # Generate a new token if one is not provided
        user_sessions[token] = ''  # Initialize the session with empty text

    # Set a default number of universities if not provided
    default_number_of_universities = 5
    response_type = request.form.get('response_type', 'json')  # Default to JSON if not provided

    if request.content_type == 'application/json':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON format"}), 400

        user_prompt = data.get('user_prompt', '')
        number_of_universities = int(data.get('number_of_universities', default_number_of_universities))

        # Construct a specific request based on the number of universities
        prompt = f"{user_prompt}\nPlease list {number_of_universities} universities with the lowest tuition fees for international students, including the tuition fee amounts."

        # Retrieve previous text from the user_sessions dictionary
        previous_text = user_sessions.get(token, '')
        base_text = f"{previous_text}\n{prompt}"

        # Store the structured text in the session
        user_sessions[token] = base_text
    elif 'file' in request.files:
        file = request.files['file']
        number_of_universities = int(request.form.get('number_of_universities', default_number_of_universities))
        response_type = request.form.get('response_type', 'json')

        if file.filename.endswith('.txt'):
            base_text = file.read().decode('utf-8')
            user_sessions[token] = base_text  # Initialize the session with the file content
            base_text += f"\nPlease list {number_of_universities} universities with the lowest tuition fees for international students, including the tuition fee amounts."
        else:
            return jsonify({"error": "Invalid file type. Please upload a .txt file"}), 400
    else:
        return jsonify({"error": "Unsupported request format or missing parameters"}), 415

    try:
        response = cohere_client.generate(
            model='command-xlarge-nightly',
            prompt=base_text,
            max_tokens=1000  # Adjust this value as needed for longer responses
        )
        generated_text = response.generations[0].text.strip()
        print("Generated text from model:", generated_text)  # Debug print

        # Parse the response into a structured format
        universities = parse_universities_response(generated_text)
        df = pd.DataFrame(universities)

        # Only keep Name and Details columns
        df = df[['Name', 'Details']]

        if response_type == 'csv':
            csv_path = '/tmp/universities_list.csv'
            df.to_csv(csv_path, index=False)
            return send_file(csv_path, as_attachment=True, mimetype='text/csv')

        elif response_type == 'graph':
            graph_path = '/tmp/universities_chart.png'
            plot_graph(df, graph_path)
            return send_file(graph_path, mimetype='image/png')

        else:
            formatted_text = generated_text.replace("\n", "<br>")
            user_sessions[token] += '\n' + generated_text
            return jsonify({"generated_text": formatted_text, "token": token})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def parse_universities_response(text):
    # Enhanced parsing logic to capture university name, rank, and tuition fee details
    universities = []
    lines = text.split('\n')
    current_university = {}

    for line in lines:
        line = line.strip()
        if line.startswith(tuple([f"{i}." for i in range(1, 21)])):  # Checks for "1.", "2.", ..., "20."
            if current_university:  # Save the previous university before starting a new one
                universities.append(current_university)
            current_university = {
                'Name': line.split(':')[0].strip(),
                'Rank': '',
                'Tuition': '',
                'Details': ''
            }

        elif current_university and line:
            # Extract ranking and tuition details
            rank_match = re.search(r'U\.S\. News Ranking \(2024\):\s*(\d+)', line, re.IGNORECASE)
            if rank_match:
                current_university['Rank'] = rank_match.group(1).strip()

            tuition_match = re.search(r'Tuition Fee for International Students:\s*[\w\s]*\s*\$([\d,]+)', line, re.IGNORECASE)
            if tuition_match:
                current_university['Tuition'] = tuition_match.group(1).strip()

            # Append additional detail lines to the 'Details' key
            current_university['Details'] += line + ' '

    # Append the last university if it exists
    if current_university:
        universities.append(current_university)

    # Clean up whitespace in details and combine Rank and Tuition into Details
    for uni in universities:
        rank_detail = f"Rank: {uni['Rank']}" if uni['Rank'] else ''
        tuition_detail = f"Tuition: ${uni['Tuition']}" if uni['Tuition'] else ''
        uni['Details'] = f"{rank_detail}, {tuition_detail}. {uni['Details'].strip()}" if uni['Details'] else 'N/A'

    return universities

def extract_fee_from_details(details):
    # Extract the first number from the details assuming it's the tuition fee
    match = re.search(r'(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)', details.replace(',', ''))
    return float(match.group(1)) if match else 0  # Return 0 if no match is found

def plot_graph(df, graph_path):
    # Ensure the 'Tuition' column is numeric if possible (e.g., parsing tuition fees)
    df['Tuition Fee'] = df['Tuition'].apply(lambda x: float(re.sub(r'[^\d.]', '', x)) if x != '' else 0)
    
    plt.figure(figsize=(12, 6))
    plt.bar(df['Name'], df['Tuition Fee'], color='skyblue')
    plt.xlabel('Universities')
    plt.ylabel('Tuition Fee (USD)')
    plt.title('Top Universities with the Lowest Tuition Fees')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(graph_path)
    plt.close()

if __name__ == '__main__':
    app.run(debug=True)
