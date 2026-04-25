// EVAC-OS Dashboard Logic

// --- Configurations & State ---
const firebaseConfig = {
    // Provide actual configs if available. Unset triggers immediate local simulation.
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

let db;
let alertsRef;
let useLocalSim = false;

// Local simulation state
let localAlerts = [];
let allRecords = [];
let isBlackoutMode = false;
let pendingSensorAlert = null;

// Priority logic mapping
const priorityMap = {
    'Fire': 'Critical',
    'Medical': 'High',
    'Threat': 'Critical',
    'Maintenance': 'Medium'
};

const iconMap = {
    'Fire': 'fa-fire',
    'Medical': 'fa-staff-snake',
    'Threat': 'fa-person-booth',
    'Maintenance': 'fa-triangle-exclamation'
};

// --- DOM References ---
const checkoutTimerDisplay = document.getElementById('checkout-timer');
const toggleBlackoutBtn = document.getElementById('toggle-blackout');
const body = document.body;
const meshBanner = document.getElementById('mesh-mode-banner');
const statusMode = document.getElementById('status-mode');
const alertsContainer = document.getElementById('alerts-container');
const guidanceContainer = document.getElementById('guidance-container');
const alertsCountNode = document.getElementById('status-alerts-count');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Modal References
const modal = document.getElementById('alert-modal');
const btnAddAlert = document.getElementById('btn-add-alert');
const btnCloseModal = document.getElementById('close-modal');
const btnCancelAlert = document.getElementById('cancel-alert');
const alertForm = document.getElementById('alert-form');

// Records References
const recordsTableBody = document.getElementById('records-table-body');
const btnExportPdf = document.getElementById('btn-export-pdf');
const btnExportWord = document.getElementById('btn-export-word');
const btnExportCsv = document.getElementById('btn-export-csv');

// Drawer References
const userProfileBtn = document.getElementById('user-profile-btn');
const profileDrawerOverlay = document.getElementById('profile-drawer-overlay');
const profileDrawer = document.getElementById('profile-drawer');
const closeDrawerBtn = document.getElementById('close-drawer');
const drawerTabs = document.querySelectorAll('.drawer-tab');
const drawerPanes = document.querySelectorAll('.d-tab-pane');

const btnSaveProfile = document.getElementById('save-profile');
const inputGuestName = document.getElementById('guest-name');
const inputGuestRoom = document.getElementById('guest-room');
const headerUserName = document.getElementById('header-user-name');
const keyRoomDisplay = document.getElementById('key-room-display');

const btnUnlockDoor = document.getElementById('btn-unlock-door');
const btnConnectWifi = document.getElementById('btn-connect-wifi');
const wifiStatus = document.getElementById('wifi-status');

// First responder references
const intelHazard = document.getElementById('intel-hazard');
const intelEntry = document.getElementById('intel-entry');
const rescueTerminal = document.getElementById('rescue-terminal');
const mapOverlays = document.getElementById('map-overlays');

// Sensor Alert references
const sensorContainer = document.getElementById('sensor-alert-container');
const sensorTitle = document.getElementById('sensor-alert-title');
const sensorDesc = document.getElementById('sensor-alert-desc');
const btnApproveSensor = document.getElementById('btn-approve-sensor');
const btnRejectSensor = document.getElementById('btn-reject-sensor');


// --- Initialization ---

function init() {
    startClock();
    setupEventListeners();
    
    // Check if Firebase configs exist
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            alertsRef = db.ref('alerts');
            setupFirebaseListeners();
            console.log("🔥 Firebase linked dynamically.");
        } catch (e) {
            console.error("Firebase init failed, switching to local sim.", e);
            startLocalSim();
        }
    } else {
        console.log("⚠️ No Firebase configuration provided. EVAC-OS launching in Local Simulation Mode.");
        startLocalSim();
    }
    
    // Auto sensor simulation
    setInterval(triggerAutoSensor, 60000); // Trigger a sensor alert every 1 minute
}

let checkoutTimerInterval = null;
let targetCheckoutDate = null;

function updateCheckoutTimer() {
    if (!targetCheckoutDate) {
        checkoutTimerDisplay.innerText = "Checkout: Not Set";
        return;
    }
    
    const now = new Date();
    const diff = targetCheckoutDate - now;
    
    if (diff <= 0) {
        checkoutTimerDisplay.innerText = "OVERDUE";
        checkoutTimerDisplay.style.color = "var(--critical-text)";
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    
    let timeString = "";
    if (days > 0) timeString += `${days}d `;
    timeString += `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    
    checkoutTimerDisplay.innerText = "Checkout: " + timeString;
    checkoutTimerDisplay.style.color = ""; 
}

function startClock() {
    updateCheckoutTimer();
}

function setupEventListeners() {
    toggleBlackoutBtn.addEventListener('click', toggleBlackoutMode);
    
    // Tab Switching
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const tabId = item.getAttribute('data-tab');
            tabContents.forEach(tc => tc.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // Modal behavior
    btnAddAlert.addEventListener('click', () => modal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));
    btnCancelAlert.addEventListener('click', () => modal.classList.add('hidden'));
    
    // Export Behaviors
    if (btnExportPdf) btnExportPdf.addEventListener('click', exportToPDF);
    if (btnExportWord) btnExportWord.addEventListener('click', exportToWord);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportToCSV);
    
    // Add Alert Form
    alertForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('alert-type').value;
        const location = document.getElementById('alert-location').value;
        
        addNewAlert(type, location);
        modal.classList.add('hidden');
    });

    // Drawer Actions
    userProfileBtn.addEventListener('click', () => {
        profileDrawerOverlay.classList.remove('hidden');
        profileDrawer.classList.add('open');
    });
    const closeDrawer = () => {
        profileDrawer.classList.remove('open');
        setTimeout(() => profileDrawerOverlay.classList.add('hidden'), 300);
    };
    closeDrawerBtn.addEventListener('click', closeDrawer);
    profileDrawerOverlay.addEventListener('click', closeDrawer);

    drawerTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            drawerTabs.forEach(t => t.classList.remove('active'));
            drawerPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`dt-${tab.getAttribute('data-dt')}`).classList.add('active');
        });
    });

    // Profile Settings
    btnSaveProfile.addEventListener('click', () => {
        const name = inputGuestName.value || 'Guest';
        const room = inputGuestRoom.value || 'Lobby';
        const checkoutVal = document.getElementById('checkout-date').value;
        
        if (checkoutVal) {
            const parts = checkoutVal.split('-');
            if(parts.length === 3) {
                targetCheckoutDate = new Date(parts[0], parts[1] - 1, parts[2], 11, 0, 0); // 11:00 AM local time
                if (checkoutTimerInterval) clearInterval(checkoutTimerInterval);
                checkoutTimerInterval = setInterval(updateCheckoutTimer, 1000);
                updateCheckoutTimer();
            }
        }

        headerUserName.innerText = name;
        keyRoomDisplay.innerText = `Zone: ${room}`;
        btnSaveProfile.innerText = "Saved!";
        setTimeout(() => btnSaveProfile.innerText = "Save Details", 2000);
        logToTerminal(`[SYSTEM] Access profile updated for ${name} at ${room}. Checkout: ${checkoutVal?checkoutVal:'Not set'}`, 'info');
    });

    // Digital Key
    btnUnlockDoor.addEventListener('click', () => {
        btnUnlockDoor.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        setTimeout(() => {
            btnUnlockDoor.innerHTML = '<i class="fa-solid fa-check"></i> Door Unlocked';
            btnUnlockDoor.classList.replace('btn-warning', 'btn-primary');
            logToTerminal(`[SECURITY] Room access granted via digital key for ${inputGuestName.value}`, 'success');
            setTimeout(() => {
                btnUnlockDoor.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i> Tap to Unlock Door';
                btnUnlockDoor.classList.replace('btn-primary', 'btn-warning');
            }, 3000);
        }, 1500);
    });

    // Wi-Fi Connect
    btnConnectWifi.addEventListener('click', () => {
        btnConnectWifi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
        wifiStatus.innerText = "";
        setTimeout(() => {
            btnConnectWifi.innerHTML = '<i class="fa-solid fa-link"></i> Connected';
            wifiStatus.innerText = "IP Assigned. Secure connection established.";
            wifiStatus.style.color = "var(--safe-color)";
            logToTerminal(`[NETWORK] Device authenticated on Secure Hotel Network`, 'success');
        }, 2000);
    });

    // Sensor Actions
    btnRejectSensor.addEventListener('click', () => {
        sensorContainer.classList.add('hidden');
        logToTerminal(`[SYSTEM] User rejected sensor anomaly in ${pendingSensorAlert.location}. Marked as false positive.`, 'warning');
        pendingSensorAlert = null;
    });

    btnApproveSensor.addEventListener('click', () => {
        sensorContainer.classList.add('hidden');
        if (pendingSensorAlert) {
            addNewAlert(pendingSensorAlert.type, pendingSensorAlert.location);
            logToTerminal(`[COMMAND] User approved sensor anomaly in ${pendingSensorAlert.location}. Incident elevated to Active Status.`, 'success');
            logToTerminal(`[DATA_UPLINK] Transmitting structural blueprints and active hazard overlays to Emergency Rescue Vehicle Alpha...`, 'info');
            
            // Dispatch to python backend for SMS notification
            fetch('http://localhost:5000/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: pendingSensorAlert.type,
                    location: pendingSensorAlert.location
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    if (data.mode === 'mock') {
                        logToTerminal(`[SMS SYSTEM] Rescue team alerted (MOCK MODE). SMS would be sent to +91 993093165.`, 'warning');
                    } else {
                        logToTerminal(`[SMS SYSTEM] Priority SMS dispatched to +91 993093165. Rescue team alerted! (SID: ${data.sid})`, 'success');
                    }
                } else {
                     logToTerminal(`[SMS SYSTEM] Error dispatching SMS: ${data.error}`, 'error');
                }
            })
            .catch(error => {
                logToTerminal(`[SMS SYSTEM] Connection to backend failed: ${error}`, 'error');
            });

            pendingSensorAlert = null;
        }
    });
}

// --- Terminal Logger ---
function logToTerminal(message, type = 'info') {
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    const line = document.createElement('div');
    line.className = `terminal-line text-${type}`;
    line.innerText = `[${time}] ${message}`;
    rescueTerminal.appendChild(line);
    rescueTerminal.scrollTop = rescueTerminal.scrollHeight;
}

// --- Auto Sensor Simulator ---

function triggerAutoSensor() {
    if (pendingSensorAlert) return; // Wait until current is resolved
    const anomalies = [
        { type: 'Fire', location: 'Hotel Room 412', desc: 'Critical thermal spike and smoke detected' },
        { type: 'Medical', location: 'Lobby Restroom', desc: 'Fall impact detected by accelerometer matrix' },
        { type: 'Threat', location: 'Server Room', desc: 'Unauthorized access and motion detected' }
    ];
    
    // Pick random
    const anomaly = anomalies[Math.floor(Math.random() * anomalies.length)];
    
    pendingSensorAlert = {
        type: anomaly.type,
        location: anomaly.location
    };
    
    sensorTitle.innerText = `AUTOMATIC HAZARD SENSE: ${anomaly.type.toUpperCase()}`;
    sensorDesc.innerText = `${anomaly.desc} in ${anomaly.location}. Awaiting human verification.`;
    
    sensorContainer.classList.remove('hidden');
    
    // If we're on responder tab, we should log it
    logToTerminal(`[SENSOR NETWORK] Anomaly detected: ${anomaly.desc} in ${anomaly.location}. Awaiting user approval...`, 'warning');
}

// --- Dynamic Behaviours ---

function toggleBlackoutMode() {
    isBlackoutMode = !isBlackoutMode;
    
    if (isBlackoutMode) {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        meshBanner.classList.remove('hidden');
        
        statusMode.innerText = "Mesh Mode Active";
        statusMode.className = "status-value success"; // Greenish text for mesh working
        document.getElementById('status-network').innerText = "Offline (Mesh)";
        document.getElementById('status-network').className = "status-value normal";
        
        toggleBlackoutBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Restore Network';
        toggleBlackoutBtn.classList.replace('btn-warning', 'btn-primary');
        logToTerminal(`[SYSTEM] Main grid offline. Switched to offline mesh communication.`, 'error');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        meshBanner.classList.add('hidden');
        
        statusMode.innerText = "Normal";
        statusMode.className = "status-value normal";
        document.getElementById('status-network').innerText = "Online";
        document.getElementById('status-network').className = "status-value success";
        
        toggleBlackoutBtn.innerHTML = '<i class="fa-solid fa-bolt-slash"></i> Simulate Network Failure';
        toggleBlackoutBtn.classList.replace('btn-primary', 'btn-warning');
        logToTerminal(`[SYSTEM] Main grid restored. Connection established.`, 'success');
    }
}

// --- Data & Alert Engine ---

function addNewAlert(type, location) {
    const priority = priorityMap[type] || 'Medium';
    const newAlert = {
        id: Date.now().toString(),
        type: type,
        location: location,
        priority: priority,
        timestamp: Date.now(),
        status: 'Unsolved'
    };

    if (!allRecords.find(r => r.id === newAlert.id)) {
        allRecords.push({...newAlert});
        renderRecordsTable();
    }

    if (useLocalSim) {
        localAlerts.push({...newAlert});
        renderAlerts(localAlerts);
    } else {
        const { status, ...firebaseAlert } = newAlert;
        alertsRef.push(firebaseAlert);
    }
    
    logToTerminal(`[EVENT] New alert logged: ${type} at ${location} [Priority: ${priority}]`, 'warning');
}

function processAlerts(alerts) {
    // Intelligent Sorting: Highest Priority -> Newest First
    const pWeight = { 'Critical': 3, 'High': 2, 'Medium': 1 };
    
    return alerts.sort((a, b) => {
        if (pWeight[a.priority] !== pWeight[b.priority]) {
            return pWeight[b.priority] - pWeight[a.priority];
        }
        return b.timestamp - a.timestamp; 
    });
}

function renderAlerts(alertsList) {
    const sortedAlerts = processAlerts(alertsList);
    alertsCountNode.innerText = sortedAlerts.length;

    if (sortedAlerts.length === 0) {
        alertsContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-shield-check" style="font-size:32px; margin-bottom:15px; color:var(--safe-color);"></i><br>No active alerts. Operational environment is secure.</div>';
        updateGuidance(null);
        updateResponderIntel(null);
        updateMapOverlays(null);
        return;
    }

    alertsContainer.innerHTML = '';
    sortedAlerts.forEach(alert => {
        const timeStr = new Date(alert.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        const icon = iconMap[alert.type] || 'fa-triangle-exclamation';
        
        const alertEl = document.createElement('div');
        alertEl.className = `alert-item priority-${alert.priority}`;
        alertEl.style.cursor = 'pointer';
        
        let statusTag = '';
        if (alert._assigned) {
             statusTag = '<span style="color:var(--safe-color); font-weight:bold; font-size:12px; margin-left: 10px;">(Assigned - Auto Solves in 15s)</span>';
        }

        alertEl.innerHTML = `
            <div class="alert-header">
                <span class="alert-type"><i class="fa-solid ${icon}"></i> ${alert.type} ${statusTag}</span>
                <span class="alert-badge ${alert.priority.toLowerCase()}">${alert.priority}</span>
            </div>
            <div class="alert-location"><i class="fa-solid fa-location-dot"></i> ${alert.location}</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;"><i class="fa-regular fa-clock"></i> Logged: ${timeStr}</div>
            
            <div class="alert-actions hidden" id="actions-${alert.id}">
                <button class="btn" style="background-color: var(--accent-orange); color: white;" onclick="handleAlertAction(event, '${alert.id}', 'assigned')">Assigned</button>
                <button class="btn btn-primary" style="background-color: var(--safe-color);" onclick="handleAlertAction(event, '${alert.id}', 'solved')">Solved</button>
                <button class="btn btn-warning" onclick="handleAlertAction(event, '${alert.id}', 'unsolved')">Unsolved</button>
            </div>
        `;

        alertEl.addEventListener('click', () => {
            const actDiv = document.getElementById(`actions-${alert.id}`);
            if (actDiv) actDiv.classList.toggle('hidden');
        });

        alertsContainer.appendChild(alertEl);
    });

    updateGuidance(sortedAlerts[0]);
    updateResponderIntel(sortedAlerts[0]);
    updateMapOverlays(sortedAlerts);
}

function updateMapOverlays(alerts) {
    mapOverlays.innerHTML = '';
    if (!alerts) return;
    
    // Put markers on map randomly or based on location
    alerts.forEach((alert, index) => {
        // Just mock some coordinates
        let top = 30 + (index * 15) % 50;
        let left = 40 + (index * 20) % 40;
        
        let typeClass = "high";
        if (alert.priority === 'Critical') typeClass = 'critical';
        if (alert.priority === 'Medium') typeClass = 'route'; // just coloring
        
        if (typeClass !== 'route') {
            const marker = document.createElement('div');
            marker.className = `zone-marker ${typeClass}`;
            marker.style.top = `${top}%`;
            marker.style.left = `${left}%`;
            marker.title = `${alert.type} at ${alert.location}`;
            mapOverlays.appendChild(marker);
        }
    });
}

// --- Intelligent Guidance Engine ---

function updateGuidance(dominantAlert) {
    if (!dominantAlert) {
        guidanceContainer.innerHTML = `
            <i class="fa-solid fa-circle-check safe-icon"></i>
            <p class="safe-text">Operations Nominal. No immediate actions required.</p>
        `;
        return;
    }

    if (dominantAlert.type === 'Fire') {
        guidanceContainer.innerHTML = `
            <div class="guidance-card">
                <h4><i class="fa-solid fa-person-running"></i> EVACUATE IMMEDIATELY</h4>
                <p>Combustion detected in <strong>${dominantAlert.location}</strong>.</p>
                <p style="margin-top: 15px; color: var(--text-main); font-size: 15px;">Avoid central stairwell. Proceed to outer egress paths securely.</p>
            </div>
        `;
    } else if (dominantAlert.type === 'Medical') {
        guidanceContainer.innerHTML = `
            <div class="guidance-card" style="border-color: var(--high-text); background-color: var(--high-light); animation: none;">
                <h4 style="color: var(--high-text);"><i class="fa-solid fa-staff-snake"></i> MEDICAL DEPLOYMENT</h4>
                <p>First response requested at <strong>${dominantAlert.location}</strong>.</p>
                <p style="margin-top: 15px; color: var(--text-main); font-size: 15px;">Clear perimeter. Maintain elevator availability for EMT teams.</p>
            </div>
        `;
    } else if (dominantAlert.type === 'Threat') {
         guidanceContainer.innerHTML = `
            <div class="guidance-card">
                <h4><i class="fa-solid fa-person-booth"></i> SECURE IN PLACE</h4>
                <p>Security anomaly in <strong>${dominantAlert.location}</strong>.</p>
                <p style="margin-top: 15px; color: var(--text-main); font-size: 15px;">Initiate lockdown protocols. Turn off ambient lighting.</p>
            </div>
        `;
    } else {
        guidanceContainer.innerHTML = `
            <div class="guidance-card" style="border-color: var(--medium-text); background-color: var(--medium-light); animation: none;">
                <h4 style="color: var(--medium-text);"><i class="fa-solid fa-wrench"></i> CAUTION ADVISEMENT</h4>
                <p>Maintenance incident at <strong>${dominantAlert.location}</strong>.</p>
                <p style="margin-top: 15px; color: var(--text-main); font-size: 15px;">Route personnel away from affected sector.</p>
            </div>
        `;
    }
}

function updateResponderIntel(dominantAlert) {
    if (!dominantAlert) {
        intelHazard.innerText = "Operations Secure";
        intelHazard.style.color = "var(--safe-color)";
        intelEntry.innerText = "Normal Access Active";
        return;
    }
    
    intelHazard.innerText = `${dominantAlert.type} Hazard`;
    intelHazard.style.color = "var(--critical-text)";
    
    if (dominantAlert.location.includes("Lobby")) {
        intelEntry.innerText = "Secondary Access (East Egress)";
    } else {
        intelEntry.innerText = "Primary Access (Main Lobby)";
    }
}

// --- Alert Workflow Controls ---
function removeAlert(id) {
    if (useLocalSim) {
        localAlerts = localAlerts.filter(a => a.id !== id);
        renderAlerts(localAlerts);
    } else {
        if (alertsRef) alertsRef.child(id).remove();
    }
}

window.handleAlertAction = function(event, id, actionType) {
    event.stopPropagation(); // Prevent the accordion from toggling when clicking the button
    
    // Update local record status
    const rec = allRecords.find(r => r.id === id);
    if (rec) {
        if (actionType === 'solved') rec.status = 'Solved';
        if (actionType === 'assigned') rec.status = 'Assigned';
        if (actionType === 'unsolved') rec.status = 'Unsolved';
        renderRecordsTable();
    }

    if (actionType === 'solved') {
        logToTerminal(`[COMMAND] Alert marked as Solved. Purging from active queue.`, 'success');
        removeAlert(id);
    } else if (actionType === 'assigned') {
        logToTerminal(`[COMMAND] Responder assigned to incident. Auto-purge initiated in 15s.`, 'warning');
        
        document.getElementById(`actions-${id}`).classList.add('hidden');
        
        if (useLocalSim) {
            const alert = localAlerts.find(a => a.id === id);
            if(alert) alert._assigned = true;
            renderAlerts(localAlerts);
        } else if (alertsRef) {
            alertsRef.child(id).update({_assigned: true});
        }
        
        setTimeout(() => {
            logToTerminal(`[SYSTEM] 15s elapsed. Assigned alert automatically resolved.`, 'info');
            const lateRec = allRecords.find(r => r.id === id);
            if (lateRec) { lateRec.status = 'Solved'; renderRecordsTable(); }
            removeAlert(id);
        }, 15000);
        
    } else if (actionType === 'unsolved') {
        logToTerminal(`[COMMAND] Incident marked Unsolved. Remaining in active dashboard.`, 'error');
        document.getElementById(`actions-${id}`).classList.add('hidden');
    }
};

// --- Firebase Sync ---
function setupFirebaseListeners() {
    useLocalSim = false;
    alertsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const alertsArray = [];
        if (data) {
            Object.keys(data).forEach(key => {
                alertsArray.push({ id: key, ...data[key] });
                // Sync allRecords
                if (!allRecords.find(r => r.id === key)) {
                    allRecords.push({ id: key, status: (data[key]._assigned ? 'Assigned' : 'Unsolved'), ...data[key] });
                    renderRecordsTable();
                } else {
                    const r = allRecords.find(r => r.id === key);
                    if (r.status !== 'Solved') r.status = data[key]._assigned ? 'Assigned' : 'Unsolved';
                }
            });
            renderRecordsTable();
        }
        renderAlerts(alertsArray);
    });
}

// --- Preload / Mocking Simulator ---
function startLocalSim() {
    useLocalSim = true;
    
    // Inject a compelling demo scenario immediately
    localAlerts = [
        {
            id: "sim_init_1",
            type: "Medical",
            location: "Floor 2 - Server Room",
            priority: "High",
            timestamp: Date.now() - 180000 
        }
    ];

    allRecords.push({...localAlerts[0], status: 'Unsolved'});
    renderRecordsTable();
    
    renderAlerts(localAlerts);
}

// --- Records & Exports ---

function renderRecordsTable() {
    if (!recordsTableBody) return;
    
    if (allRecords.length === 0) {
        recordsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">No historical records found.</td></tr>';
        return;
    }
    
    recordsTableBody.innerHTML = '';
    
    // Reverse chron sort
    const sortedRecords = [...allRecords].sort((a,b) => b.timestamp - a.timestamp);
    
    sortedRecords.forEach(rec => {
        const tr = document.createElement('tr');
        const timeStr = new Date(rec.timestamp).toLocaleString();
        
        let statusBadge = '';
        if (rec.status === 'Solved') {
            statusBadge = '<span style="color:var(--safe-color); font-weight:600;"><i class="fa-solid fa-check"></i> Solved</span>';
        } else if (rec.status === 'Assigned') {
            statusBadge = '<span style="color:var(--accent-orange); font-weight:600;"><i class="fa-solid fa-hourglass-half"></i> Assigned</span>';
        } else {
            statusBadge = '<span style="color:var(--critical-text); font-weight:600;"><i class="fa-solid fa-circle-exclamation"></i> Unsolved</span>';
        }

        tr.innerHTML = `
            <td>${timeStr}</td>
            <td style="font-weight:600;">${rec.type}</td>
            <td>${rec.location}</td>
            <td>${rec.priority}</td>
            <td>${statusBadge}</td>
        `;
        recordsTableBody.appendChild(tr);
    });
}

function exportToPDF() {
    if (typeof window.jspdf === 'undefined' || allRecords.length === 0) return alert("Nothing to export or PDF library not loaded.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("EVAC-OS Alert Records", 14, 15);
    
    const tableData = [...allRecords].sort((a,b) => b.timestamp - a.timestamp).map(rec => [
        new Date(rec.timestamp).toLocaleString(),
        rec.type,
        rec.location,
        rec.priority,
        rec.status
    ]);

    doc.autoTable({
        head: [['Trigger Time', 'Alert Type', 'Location', 'Intensity', 'Status']],
        body: tableData,
        startY: 25,
        theme: 'grid'
    });

    doc.save('evacos_records.pdf');
}

function exportToWord() {
    if (allRecords.length === 0) return alert("Nothing to export.");
    
    let htmlContent = `
    <html><head><meta charset="UTF-8"></head><body>
    <h2>EVAC-OS Alert Records</h2>
    <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr>
            <th>Trigger Time</th>
            <th>Alert Type</th>
            <th>Location</th>
            <th>Intensity</th>
            <th>Status</th>
        </tr>
    `;
    
    const sortedRecords = [...allRecords].sort((a,b) => b.timestamp - a.timestamp);
    sortedRecords.forEach(rec => {
        htmlContent += `<tr>
            <td style="padding: 5px;">${new Date(rec.timestamp).toLocaleString()}</td>
            <td style="padding: 5px;">${rec.type}</td>
            <td style="padding: 5px;">${rec.location}</td>
            <td style="padding: 5px;">${rec.priority}</td>
            <td style="padding: 5px;">${rec.status}</td>
        </tr>`;
    });
    
    htmlContent += `</table></body></html>`;
    
    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evacos_records.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToCSV() {
    if (allRecords.length === 0) return alert("Nothing to export.");
    
    const sortedRecords = [...allRecords].sort((a,b) => b.timestamp - a.timestamp);
    let csvContent = "Trigger Time,Alert Type,Location,Intensity,Status\n";
    
    sortedRecords.forEach(rec => {
        // Handle quotes/commas in fields
        const time = '"' + new Date(rec.timestamp).toLocaleString().replace(/"/g, '""') + '"';
        const type = '"' + rec.type.replace(/"/g, '""') + '"';
        const loc = '"' + rec.location.replace(/"/g, '""') + '"';
        const prio = '"' + rec.priority.replace(/"/g, '""') + '"';
        const stat = '"' + rec.status.replace(/"/g, '""') + '"';
        
        csvContent += `${time},${type},${loc},${prio},${stat}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evacos_records.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Boot application
window.onload = init;
