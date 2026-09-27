# PotholeFinder
UMBC Hackathon 26'

# About the project
Our application automatically detects when a user drives over a pothole and records its location. Based on the user’s preferences, it can either prompt them to report the pothole immediately or wait until they are safely stopped.

The application then streamlines the reporting process for Baltimore City’s 311 system (https://balt311.baltimorecity.gov/citizen/s/). Normally, residents first need to find Baltimore City’s 311 website, then find the pothole section hidden under the Street tab, and then manually submit a report. Our app removes that friction.

When the user initially loads the application for the first time, they will be prompted to enter their personal information (name, phone number, and email). Every time the user drives over a pothole, they can indicate whether the problem involves a water meter, valve, manhole, or steel plate. The application then uses the collected data to auto-fill the form with the required information and submit the report to Baltimore City Administration. The collected data includes:
- The exact location of the pothole
- The pothole location type: Street, Alley, Footway, or Curb
- Whether the issue is caused by a water meter, valve, manhole, or steel plate
- Contact information: name, phone number, and email
 
# FrontEnd
React.js Framework

The frontend is organized by responsibility under `Frontend/src`:
- `pages/` contains the map, backlog, and profile screens.
- `components/` contains reusable map, search, navigation, and report-dialog UI.
- `services/` and `utils/` contain location search and shared report formatting.
- `styles/` contains the app's layout, page, map, and responsive stylesheets; `App.css` imports them in cascade order.

# Backend
The backend of the appication is a Python Flask server.
Responsible for intake of data record from the Hardware components


To install depenancies, run the following command in the Backend Directory:
```
python -m pip install -r requirements.txt
```

To run the python server, navagate to the Backend directory and run:
```
python app.py
```

# DataBase

Sqlite database for pothole reccords.
Hosted on Turso.


# Hardware
Raspberry PI 4 model B, using a mpu 6050 modual for gyroscope and accelerometer mesurements.

Shock - Baseline = Real Shock Data

Calibration Period is to find a Shock baseline
