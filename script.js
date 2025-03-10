// Configuration - Replace these with your actual values
const API_BASE_URL = 'https://20.168.192.4/api/admin/';
const API_USERNAME = 'admin';
const API_PASSWORD = 'Cnmrw002ra.';
const VMRS = [
    'conference1_alias',
    'conference2_alias',
    'conference3_alias'
    // Add more VMR aliases as needed
];

async function fetchVMRStatus(vmrAlias) {
    const url = `${API_BASE_URL}status/v1/conference/?name=${encodeURIComponent(vmrAlias)}`;
    try {
        // fetch uses browser's HTTPS defaults; no way to disable cert check here
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(`${API_USERNAME}:${API_PASSWORD}`),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.objects[0] || null;
    } catch (error) {
        console.error(`Error fetching VMR ${vmrAlias}:`, error);
        return null;
    }
}

async function fetchParticipants(conferenceId) {
    const url = `${API_BASE_URL}status/v1/participant/?conference=${encodeURIComponent(conferenceId)}`;
    try {
        // Browser enforces certificate validation; no override possible
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(`${API_USERNAME}:${API_PASSWORD}`),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.objects;
    } catch (error) {
        console.error(`Error fetching participants for ${conferenceId}:`, error);
        return [];
    }
}

async function muteParticipant(participantId, mute) {
    const action = mute ? 'mute' : 'unmute';
    const url = `${API_BASE_URL}command/v1/participant/${action}/`;
    try {
        // HTTPS certificate validation is browser-controlled
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${API_USERNAME}:${API_PASSWORD}`),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ participant: participantId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error ${action}ing participant ${participantId}:`, error);
        return false;
    }
}

async function disconnectParticipant(participantId) {
    const url = `${API_BASE_URL}command/v1/participant/disconnect/`;
    try {
        // No client-side option to skip cert check in fetch
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${API_USERNAME}:${API_PASSWORD}`),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ participant: participantId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error(`Error disconnecting participant ${participantId}:`, error);
        return false;
    }
}

async function loadAllParticipants() {
    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = ''; // Clear previous content

    let allParticipants = [];

    // Fetch participants from all VMRs
    for (const vmrAlias of VMRS) {
        const vmrData = await fetchVMRStatus(vmrAlias);
        if (vmrData && vmrData.id) {
            const participants = await fetchParticipants(vmrData.id);
            const participantsWithVMR = participants.map(participant => ({
                ...participant,
                vmrName: vmrData.name
            }));
            allParticipants = allParticipants.concat(participantsWithVMR);
        }
    }

    // Render all participants with control buttons
    if (allParticipants.length === 0) {
        participantsList.innerHTML = '<li>No participants found across all VMRs.</li>';
    } else {
        allParticipants.forEach(participant => {
            const li = document.createElement('li');
            const isMuted = participant.is_muted || false;

            const infoSpan = document.createElement('span');
            infoSpan.textContent = `${participant.display_name || 'Unknown'} (VMR: ${participant.vmrName}, Role: ${participant.role}, Connected: ${participant.start_time || 'N/A'})`;

            const muteBtn = document.createElement('button');
            muteBtn.className = `mute-btn ${isMuted ? 'muted' : ''}`;
            muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
            muteBtn.onclick = async () => {
                const success = await muteParticipant(participant.id, !isMuted);
                if (success) {
                    muteBtn.textContent = isMuted ? 'Mute' : 'Unmute';
                    muteBtn.classList.toggle('muted');
                    participant.is_muted = !isMuted;
                } else {
                    alert(`Failed to ${isMuted ? 'unmute' : 'mute'} ${participant.display_name}`);
                }
            };

            const disconnectBtn = document.createElement('button');
            disconnectBtn.className = 'disconnect-btn';
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.onclick = async () => {
                const success = await disconnectParticipant(participant.id);
                if (success) {
                    li.remove();
                } else {
                    alert(`Failed to disconnect ${participant.display_name}`);
                }
            };

            li.appendChild(infoSpan);
            li.appendChild(muteBtn);
            li.appendChild(disconnectBtn);
            participantsList.appendChild(li);
        });
    }
}

// Load participants on page load
window.onload = loadAllParticipants;