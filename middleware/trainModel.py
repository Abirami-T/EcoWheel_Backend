import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import pygmo as pg

# Load the dataset
data = pd.read_csv('/content/drive/MyDrive/MAIN_PHASEII/CO_Emissions.csv')

# Data preprocessing
# Encode categorical variables
label_encoders = {}
for column in ['Fuel Type']:
    label_encoders[column] = LabelEncoder()
    data[column] = label_encoders[column].fit_transform(data[column])

# Split the dataset into features (X) and target variable (y)
X = data.drop(columns=['CO Emissions(g/km)'])  # Exclude the target variable
y = data['CO Emissions(g/km)']  # Target variable

# Define the objective function for optimization
class COEmissionProblem:
    def __init__(self, X_train, y_train):
        self.X_train = X_train
        self.y_train = y_train

    def fitness(self, threshold):
        # Ensure threshold is a single value
        threshold = threshold[0] if hasattr(threshold, '__getitem__') else threshold
        # Transform CO Emissions to binary outcome based on threshold
        y_binary = (self.y_train > threshold).astype(int)
        # Train the Random Forest classifier
        model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        model.fit(self.X_train, y_binary)
        # Make predictions on the training set
        y_pred_train = model.predict(self.X_train)
        # Evaluate the model
        accuracy = accuracy_score(y_binary, y_pred_train)
        # Minimize negative accuracy (maximize accuracy)
        return [-accuracy]

    def get_bounds(self):
        # Define bounds for the threshold
        return [140], [160]

# Split the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Create an instance of the problem
problem = COEmissionProblem(X_train, y_train)

# Use Differential Evolution Algorithm to optimize the threshold
algo = pg.algorithm(pg.de(gen=50))
pop = pg.population(prob=problem, size=10)
pop = algo.evolve(pop)

# Get the best threshold from the optimization algorithm
best_threshold = pop.champion_x[0]

print("Best Threshold:", best_threshold)

# Transform CO Emissions to binary outcome based on the optimized threshold
y_train_binary = (y_train > best_threshold).astype(int)
y_test_binary = (y_test > best_threshold).astype(int)

# Train the Random Forest classifier using the optimized threshold
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train_binary)

# Input from user
engine_size = float(input("Enter Engine Size (L): "))
cylinders = int(input("Enter Number of Cylinders: "))
fuel_type = input("Enter Fuel Type (Z or X): ")
fuel_city = float(input("Enter Fuel Consumption City (L/100 km): "))
fuel_hwy = float(input("Enter Fuel Consumption Hwy (L/100 km): "))
fuel_comb = float(input("Enter Fuel Consumption Comb (L/100 km): "))
fuel_comb_mpg = float(input("Enter Fuel Consumption Comb (mpg): "))
co_emission = float(input("Enter CO Emission Value: "))
# Encode fuel type
fuel_type_encoded = label_encoders['Fuel Type'].transform([fuel_type])[0]

# Make prediction
input_data = [[engine_size, cylinders, fuel_type_encoded, fuel_city, fuel_hwy, fuel_comb, fuel_comb_mpg, co_emission]]
prediction = model.predict(input_data)

# Output prediction
if best_threshold > co_emission:
    print("Prediction: The CO emission is likely to be below the threshold.")
else:
    print("Prediction: The CO emission is likely to be above the threshold.")

# Test accuracy on test set
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test_binary, y_pred)
print("Accuracy on test set:", accuracy)
