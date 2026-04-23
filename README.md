#  EVAC-OS : Autonomous Crisis Response System

**EVAC-OS** is a failure-resilient, intelligent emergency response platform designed for hospitality environments. It ensures seamless communication, coordination, and evacuation guidance even during worst-case scenarios where traditional systems fail.

---

##  Problem Statement

During critical emergencies, conventional systems often collapse when they are needed most:

* Internet and servers go down
* Communication becomes fragmented
* Response efforts turn chaotic

This leads to delays, confusion, and increased risk to human life.

---

##  Solution

EVAC-OS is built to operate **even in complete system failure scenarios**. It leverages decentralized communication, intelligent prioritization, and real-time guidance to ensure coordinated crisis response.

It transforms every device into a communication node and provides actionable insights to both internal teams and external responders.

---

##  Extended Platform Features

EVAC-OS extends beyond emergency response to function as a **unified hospitality dashboard**, enhancing both operational efficiency and guest experience.

###  Guest-Centric Capabilities

* ** Guest Registration**
  Enables seamless digital check-in, allowing guests to register and access services quickly

* ** Digital Room Key**
  Provides secure, app-based room access, eliminating the need for physical keys

* ** Wi-Fi Access Integration**
  Simplifies connectivity by offering instant Wi-Fi access through the platform

* ** Guest Access to Safety System**
  Guests can directly interact with EVAC-OS to:

  * Receive real-time emergency alerts
  * Access evacuation guidance
  * Report emergencies instantly

---

###  Unified Experience

By combining **hospitality services with crisis response**, EVAC-OS creates a single, integrated platform where:

* Daily convenience meets emergency preparedness
* Guests remain informed and connected at all times
* Safety becomes a seamless part of the overall guest experience

---

**EVAC-OS transforms traditional hotel systems into a smart, connected, and safety-first ecosystem.**


##  Key Features

*  **Failure-Resilient Communication**
  Operates without internet, using simulated mesh-based communication

*  **Real-Time Alert System**
  Displays and updates emergency alerts instantly using Firebase Realtime Database

*  **Intelligent Priority Engine**
  Automatically prioritizes emergencies based on severity

*  **Dynamic Evacuation Guidance**
  Provides real-time escape instructions based on active hazards

*  **Blackout Mode Simulation**
  Demonstrates system behavior during network failure scenarios

*  **First Responder Dashboard**
  Shares live hazard zones, building layout, and entry strategies

*  **Interactive Alert Simulation**
  Allows users to trigger emergency scenarios for demonstration

---

##  Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Firebase Realtime Database
* **Design:** Warm UI theme with responsive layout
* **Tools:** VS Code, GitHub

---

##  Project Structure

```
evac-os/
│── index.html      # Main dashboard UI
│── style.css       # Styling (warm theme)
│── script.js       # Logic + Firebase integration
│── README.md       # Project documentation
```

---

##  Setup Instructions

### 1. Clone the Repository

```
git clone https://github.com/your-username/evac-os.git
cd evac-os
```

### 2. Configure Firebase

* Create a project in Firebase
* Enable Realtime Database (Test Mode)
* Replace Firebase config in `script.js`:

```JavaScript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "...",
  databaseURL: "...",
  projectId: "..."
};
```

---

### 3. Run the Project

* Open `index.html` in your browser

---

## 🧪 Demo Scenario

Simulate a real crisis:

1. Trigger a **Fire Alert**
2. Activate **Blackout Mode**
3. Observe:

   * Alerts updating in real-time
   * Priority-based sorting
   * Dynamic evacuation instructions
   * Responder dashboard insights

---

##  Use Cases

* Hotels & Resorts
* Shopping Malls
* Airports
* Large Event Venues

---

##  Innovation Highlights

* Designed for **worst-case scenarios**
* Works without reliance on centralized infrastructure
* Bridges gap between **internal chaos and external response**
* Focus on **real-time coordination and decision-making**

---

##  Future Enhancements

* Real Bluetooth mesh networking
* AI-based CCTV hazard detection
* Indoor navigation with live mapping
* Mobile app integration

