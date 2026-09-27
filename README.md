# PotholeFinder
UMBC Hackathon 26'

# About the project
(Be sure to write what inspired you, what you learned, how you built your project, and the challenges you faced. Format your story in Markdown, with LaTeX support for math.)

The system will be initially be centered around/launched in Baltimore city and then will be further wokred to be compatible with other jurisdiction in Maryland then other states.  

The data collected will be sent to: https://balt311.baltimorecity.gov/citizen/s/
Normally the user will need to manually submit the report but user has to initially find the pothole section which is hidden under the street tab. The system further more asks the user to input the picture of the pothole/any documentation associated with the pothole (if available), exact location of the pothole, where the pothole is located (Street, Alley, Footway, Curb), Is the problem due to a water meter, valve, manhole or steel plate?, and How can they reach you? (need to include personal info: name, phone no, and email) 

Our app will ask the user to input their personal info (name, phone no, and email), we can give the user option to input "If the problem was due to a water meter, valve, manhole or steel plate?" and then auto fill the form using the collected and send the report to Baltimore City Administration. 
 
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
