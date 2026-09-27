#!/usr/bin/python3


#############################################
#
#   Impact Force Monitor - MPU6050 Version
#
#############################################


####################################
# Libraries
####################################
import smbus
import RPi.GPIO as GPIO
import time
import math
from signal import signal, SIGINT, SIGTERM
from sys import exit




####################################
# User Parameters
####################################


# MPU6050 default I2C address
# Usually 0x68
addr = 0x68


# LED GPIO pin
LED = 26


# Impact thresholds in G
WARNING_G = 2.0
DANGER_G = 4.0


# Files
allData = open("AllSensorData.txt", "a")
alrtData = open("AlertData.txt", "a")




####################################
# MPU6050 Registers
####################################


PWR_MGMT_1 = 0x6B


ACCEL_CONFIG = 0x1C


ACCEL_XOUT_H = 0x3B
ACCEL_YOUT_H = 0x3D
ACCEL_ZOUT_H = 0x3F




####################################
# Create I2C bus
####################################


bus = smbus.SMBus(1)




####################################
# GPIO Initialization
####################################


GPIO.setmode(GPIO.BCM)
GPIO.setup(LED, GPIO.OUT)
GPIO.output(LED, GPIO.LOW)




####################################
# MPU6050 Initialization
####################################




def initialize():


   # Wake up MPU6050
   # MPU6050 starts in sleep mode by default
   bus.write_byte_data(addr, PWR_MGMT_1, 0x00)


   time.sleep(0.1)


   # Set accelerometer range to +/- 8G
   #
   # 0x00 = +/- 2G
   # 0x08 = +/- 4G
   # 0x10 = +/- 8G
   # 0x18 = +/- 16G


   bus.write_byte_data(addr, ACCEL_CONFIG, 0x10)


   print("MPU6050 initialized")




####################################
# Read Signed 16-bit Value
####################################


def read_word_2c(register):


   high = bus.read_byte_data(addr, register)
   low = bus.read_byte_data(addr, register + 1)


   value = (high << 8) + low


   if value >= 0x8000:
       value = -((65535 - value) + 1)


   return value




####################################
# Read Accelerometer
####################################


def readAxes():


   x_raw = read_word_2c(ACCEL_XOUT_H)
   y_raw = read_word_2c(ACCEL_YOUT_H)
   z_raw = read_word_2c(ACCEL_ZOUT_H)


   return x_raw, y_raw, z_raw




####################################
# Convert Raw Accelerometer -> G
####################################


def convertToG(x_raw, y_raw, z_raw):


   # Because we selected +/-8G:
   #
   # MPU6050 sensitivity:
   #
   # +/-2G  = 16384 LSB/g
   # +/-4G  = 8192 LSB/g
   # +/-8G  = 4096 LSB/g
   # +/-16G = 2048 LSB/g


   sensitivity = 4096.0


   x = x_raw / sensitivity
   y = y_raw / sensitivity
   z = z_raw / sensitivity


   return x, y, z




####################################
# Calculate Total Acceleration
####################################


def calculateTotalG(x, y, z):


   total_g = math.sqrt(
       x**2 +
       y**2 +
       z**2
   )


   return total_g




####################################
# Detect Impact
####################################


def isDanger(timestamp, x, y, z, total_g):


   # Normal resting sensor will usually read about 1G
   # because gravity is always acting on it.


   if total_g >= DANGER_G:


       print("!!! LARGE IMPACT DETECTED !!!")


       alrtData.write(
           str(timestamp)
           + "\t"
           + "DANGER"
           + "\t"
           + "x: " + str(round(x, 3))
           + "\t"
           + "y: " + str(round(y, 3))
           + "\t"
           + "z: " + str(round(z, 3))
           + "\t"
           + "total: " + str(round(total_g, 3))
           + "\n"
       )


       alrtData.flush()


       GPIO.output(LED, GPIO.HIGH)


   elif total_g >= WARNING_G:


       print("Impact detected")


       alrtData.write(
           str(timestamp)
           + "\t"
           + "WARNING"
           + "\t"
           + "x: " + str(round(x, 3))
           + "\t"
           + "y: " + str(round(y, 3))
           + "\t"
           + "z: " + str(round(z, 3))
           + "\t"
           + "total: " + str(round(total_g, 3))
           + "\n"
       )


       alrtData.flush()


       GPIO.output(LED, GPIO.HIGH)


   else:


       GPIO.output(LED, GPIO.LOW)




####################################
# Cleanup
####################################


def cleanup(signal_received, frame):


   print("\nStopping sensor...")


   allData.close()
   alrtData.close()


   GPIO.output(LED, GPIO.LOW)
   GPIO.cleanup()


   exit(0)




####################################
# Main
####################################


def main():


   signal(SIGINT, cleanup)
   signal(SIGTERM, cleanup)


   initialize()


   print("Starting MPU6050 stream")
   print("-----------------------")


   while True:


       timestamp = time.ctime()


       # Read raw acceleration
       x_raw, y_raw, z_raw = readAxes()


       # Convert to G
       x, y, z = convertToG(
           x_raw,
           y_raw,
           z_raw
       )


       # Calculate combined acceleration
       total_g = calculateTotalG(x, y, z)


       # Check impact
       isDanger(
           timestamp,
           x,
           y,
           z,
           total_g
       )


       # Save all readings
       allData.write(
           str(timestamp)
           + "\t"
           + "x: " + str(round(x, 3))
           + "\t"
           + "y: " + str(round(y, 3))
           + "\t"
           + "z: " + str(round(z, 3))
           + "\t"
           + "total: " + str(round(total_g, 3))
           + "\n"
       )


       allData.flush()


       # Display readings
       print(
           "X: {:.2f} G | "
           "Y: {:.2f} G | "
           "Z: {:.2f} G | "
           "Total: {:.2f} G".format(
               x,
               y,
               z,
               total_g
           )
       )


       # Faster sampling than original code
       time.sleep(0.05)




####################################
# Start
####################################


if __name__ == "__main__":
   main()
  
  
  

