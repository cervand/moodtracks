const clientId = "e74c0bff1ca849d5a028a9f445c6ead3"; // Replace with your client ID
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

var trackScope = 'short_term'
var trackLimit = '50'



if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    console.log(profile); // Profile data logs to console
    populateUI(profile);
}

export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "https://www.moodtracks.me/yourmoodtracks.html");
    params.append("scope", "user-read-private user-read-email user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) { 
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "https://www.moodtracks.me/yourmoodtracks.html");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token) {
    var apiCall = 'https://api.spotify.com/v1/me/top/tracks?time_range=' + trackScope + '&limit=' + trackLimit;
    console.log(apiCall);

    const result = await fetch(apiCall, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    const responseData = await result.json();

    return responseData;
}

function populateUI(profile) {
    var listContainer = document.getElementById("songList");
    listContainer.innerHTML = ""; // Clear previous entries
  
    for (var i = 0; i < profile.items.length; i++) {
      var songName = document.createElement("span");
      var artistName = document.createElement("span");

      console.log(profile.items[i].name);

      songName.textContent = profile.items[i].name;
      artistName.textContent = profile.items[i].artists[0].name;
      listContainer.appendChild(songName);
      listContainer.appendChild(artistName);
    }
  }