// Configuration - Replace these with your actual values
const API_BASE_URL = 'https://20.168.192.4/api/admin/'; // Your Pexip manager address
const API_USERNAME = 'admin';
const API_PASSWORD = 'Cnmrw002ra.';
const VMRS = [
    'vmr1', // Specify the VMR aliases you want to monitor
    'conference2_alias',
    'conference3_alias'
];

async function fetchAllParticipants() {
    const url = `${API_BASE_URL}status/v1/participant/`;
    console.log(`Fetching all participants: ${url}`);
    try {
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
        console.log('Participants response:', data);
        return data.objects || [];
    } catch (error) {
        console.error('Error fetching participants:', error);
        return [];
    }
}

async function muteParticipant(participantId, mute) {
    const action = mute ? 'mute' : 'unmute';
    const url = `${API_BASE_URL}command/v1/participant/${action}/`;
    console.log(`${mute ? 'Muting' : 'Unmuting'} participant ${participantId}: ${url}`);
    try {
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
        console.log(`Successfully ${action}d participant ${participantId}`);
        return true;
    } catch (error) {
        console.error(`Error ${action}ing participant ${participantId}:`, error);
        return false;
    }
}

async function disconnectParticipant(participantId) {
    const url = `${API_BASE_URL}command/v1/participant/disconnect/`;
    console.log(`Disconnecting participant ${participantId}: ${url}`);
    try {
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
        console.log(`Successfully disconnected participant ${participantId}`);
        return true;
    } catch (error) {
        console.error(`Error disconnecting participant ${participantId}:`, error);
        return false;
    }
}

async function loadAllParticipants() {
    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = '<li>Loading participants...</li>'; // Initial feedback

    const allParticipants = await fetchAllParticipants();

    // Filter participants to only those in specified VMRs
    const filteredParticipants = allParticipants.filter(participant =>
        VMRS.includes(participant.conference_name)
    );

    participantsList.innerHTML = ''; // Clear loading message
    if (filteredParticipants.length === 0) {
        participantsList.innerHTML = '<li>No participants found in specified VMRs. Check console for details.</li>';
        console.log('Filtered participants:', filteredParticipants);
        console.log('Possible issues: VMR aliases incorrect, no participants in these VMRs, or API access denied.');
    } else {
        console.log(`Rendering ${filteredParticipants.length} participants from specified VMRs`);
        filteredParticipants.forEach(participant => {
            const li = document.createElement('li');
            const isMuted = participant.is_muted || false;

            const infoSpan = document.createElement('span');
            infoSpan.textContent = `${participant.display_name || 'Unknown'} (VMR: ${participant.conference_name || 'N/A'}, Role: ${participant.role || 'N/A'}, Connected: ${participant.start_time || 'N/A'})`;

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