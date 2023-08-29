const clientId = "e74c0bff1ca849d5a028a9f445c6ead3"; // Replace with your client ID
const redirectUri = "http://localhost:5500/yourmoodtracks.html";
const apiScope = "user-read-private user-read-email user-top-read user-library-read";

var trackScope = 'short_term';
const trackLimit = '50';
const displayedTrackListLimit = 10;
var fullUserTrackList = [];
var loadedUserTracks = false;

const urlParams = new URLSearchParams(window.location.search);
let code = urlParams.get('code');


var shortTermUserTracks;
var mediumTermUserTracks;
var longTermUserTracks;


if (!code) {
    let codeVerifier = generateRandomString(128);
    generateCodeChallenge(codeVerifier).then(codeChallenge => {
        let state = generateRandomString(16);

        localStorage.setItem('code_verifier', codeVerifier);

        let args = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            scope: apiScope,
            redirect_uri: redirectUri,
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge
        });

        window.location = 'https://accounts.spotify.com/authorize?' + args;
    });
}
else {
    let codeVerifier = localStorage.getItem('code_verifier');

    let body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
    });

    const response = fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('access_token', data.access_token);
        })
        .catch(error => {
            console.error('Error:', error);
        });



    shortTermUserTracks = await getUserTopTracks('short_term', trackLimit);
    mediumTermUserTracks = await getUserTopTracks('medium_term', trackLimit);
    longTermUserTracks = await getUserTopTracks('long_term', trackLimit);


    await populateTopTracks(shortTermUserTracks, "short");
    await populateMoodtracks(shortTermUserTracks);

    var newArr = quickSort(await saveUserLibraryStartingFrom(0), 0, fullUserTrackList.length-1);

    await populateRareTracks();
    console.log(fullUserTrackList);
}

var shortTermButton = document.querySelector('#top-tracks-past-month-button');
shortTermButton.addEventListener('click', function () {
    populateTopTracks(shortTermUserTracks, "short");
    removeAllCurrentHighlightedButtons();
    shortTermButton.classList.add("selected-top-tracks-option");
});

var mediumTermButton = document.querySelector('#top-tracks-past-six-months-button');
mediumTermButton.addEventListener('click', function () {
    populateTopTracks(mediumTermUserTracks, "medium");
    removeAllCurrentHighlightedButtons();
    mediumTermButton.classList.add("selected-top-tracks-option");
});

var longTermButton = document.querySelector('#top-tracks-all-time-button');
longTermButton.addEventListener('click', function () {
    populateTopTracks(longTermUserTracks, "long");
    removeAllCurrentHighlightedButtons();
    longTermButton.classList.add("selected-top-tracks-option");
});


function removeAllCurrentHighlightedButtons(){
    shortTermButton.classList.remove("selected-top-tracks-option");
    mediumTermButton.classList.remove("selected-top-tracks-option");
    longTermButton.classList.remove("selected-top-tracks-option");
}

function generateRandomString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    function base64encode(string) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);

    return base64encode(digest);
}

async function getUserTopTracks(timePeriod, trackListLength) {
    var apiCall = 'https://api.spotify.com/v1/me/top/tracks?time_range=' + timePeriod + '&limit=' + trackListLength;
    let accessToken = localStorage.getItem('access_token');

    const response = await fetch(apiCall, {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });

    return await response.json();
}


async function getResponse(apiCall){
    let accessToken = localStorage.getItem('access_token');

    const response = await fetch(apiCall, {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });

    return await response.json();
}

async function saveUserLibraryStartingFrom(offset){
    var userLibrarySegment = await getResponse('https://api.spotify.com/v1/me/tracks?limit=50&offset='+offset);

    for(var i = 0; i < userLibrarySegment.items.length; i++){
        fullUserTrackList.push(userLibrarySegment.items[i]);
    }
    console.log(userLibrarySegment.next);
    console.log(fullUserTrackList);

    if(userLibrarySegment.next != null){
        return await saveUserLibraryStartingFrom(offset+50);
    }
    else{
        loadedUserTracks=true;
        return fullUserTrackList;
    }
}

async function populateTopTracks(userTopTrackData, timePeriod) {
    var trackList = document.getElementById("top-tracks-story-track-list");
    trackList.innerHTML = ""; // Clear previous entries

    var topTrackTitle = document.getElementById("top-tracks-story-title");
    
    switch(timePeriod){
        case "short":
            topTrackTitle.innerHTML="My top tracks of the past month";
            break;
        case "medium":
            topTrackTitle.innerHTML="My top tracks of the past six months";
            break;
        case "long":
            topTrackTitle.innerHTML="My top tracks of all time";
            break;
    }

    for (var i = 0; i < displayedTrackListLimit; i++) {
        var trackName = document.createElement("span");
        var artistName = document.createElement("span");
        var individualTrackData = document.createElement("div");
        var rankNumber = document.createElement("span");

        individualTrackData.setAttribute("id", "individualTrackData");
        artistName.setAttribute("id", "artistName");
        rankNumber.setAttribute("id", "rankNumber");

        rankNumber.textContent = (i + 1).toString();
        trackName.textContent = userTopTrackData.items[i].name +' - ';
        artistName.textContent = userTopTrackData.items[i].artists[0].name;

        individualTrackData.appendChild(trackName);
        individualTrackData.appendChild(artistName);

        trackList.appendChild(rankNumber);
        trackList.appendChild(individualTrackData);
    }
}

function quickSort(arr, first, last){
    if(first < last){
        const pivot = partition(arr, first, last);
        quickSort(arr, first, pivot-1);
        quickSort(arr, pivot+1,last);
    }
}

function partition(arr, first, last){
    swap(arr, Math.floor(((last-first)/2) + first), last);
    const pivotVal = arr[last].track.popularity;
    var i = first-1;

    for(var j = first; j<last; j++){
        if(arr[j].track.popularity <= pivotVal){
            i++;
            swap(arr, i, j);
        }
    }
    var pivotPos = i+1
    swap(arr, last, pivotPos);
    return pivotPos
}

function swap(arr, i, j){
    const tempVal = arr[i];
    arr[i] = arr[j];
    arr[j] = tempVal;
}


async function populateRareTracks(){
    var topThree = [];
    var libraryIndex = 0;
    var topThreeIndex = 0;

    var img1 = document.getElementsByClassName("album-img1")[0];
    var img2 = document.getElementsByClassName("album-img2")[0];
    var img3 = document.getElementsByClassName("album-img3")[0];  

    var track1 = document.getElementsByClassName("rare-track1")[0];
    var track2 = document.getElementsByClassName("rare-track2")[0];
    var track3 = document.getElementsByClassName("rare-track3")[0]; 

    track1.innerHTML = "";
    track2.innerHTML = ""; 
    track3.innerHTML = "";

    while(topThreeIndex < 3){
        if(fullUserTrackList[libraryIndex].track.popularity > 0){
            topThree.push(fullUserTrackList[libraryIndex]);
            topThreeIndex++;
        }
        libraryIndex++;
    }


    for(var i = 0; i < topThree.length;i++){
        var trackName = document.createElement("span");
        var artistName = document.createElement("span");

        artistName.classList.add("raretracks-artist");
        trackName.classList.add("raretracks-track");


        trackName.textContent = topThree[i].track.name;
        artistName.textContent = topThree[i].track.artists[0].name;

        if(i == 0){
            track1.appendChild(trackName);
            track1.appendChild(artistName);
        }
        if(i == 1){
            track2.appendChild(trackName);
            track2.appendChild(artistName);
        }
        if(i == 2){
            track3.appendChild(trackName);
            track3.appendChild(artistName);
        }
    }

    img1.setAttribute("src", topThree[0].track.album.images[0].url);
    img2.setAttribute("src", topThree[1].track.album.images[1].url);
    img3.setAttribute("src", topThree[2].track.album.images[2].url);
}

async function populateMoodtracks(tracksToSort){
    //traverse tracks to sort
    //sort tracks based on their +valence
    //sort tracks based on their -valence
    //sort tracks based on their +energy


    var happyGrid = document.getElementById("moodtracks-happy-grid");
    var tenderGrid = document.getElementById("moodtracks-tender-grid");
    var energeticGrid = document.getElementById("moodtracks-energetic-grid");

    var moodtracksSectors = [happyGrid,tenderGrid,energeticGrid];

    for(var i =0; i< 3; i++){
        for(var j = 0; j<3;j++){
            var trackNameSpan = document.createElement("span");
            var artistNameSpan = document.createElement("span");
            trackNameSpan.setAttribute("id", "moodtracks-artist");
            artistNameSpan.setAttribute("id", "moodtracks-artist");

            var trackInfoDiv = document.createElement("div");
            var albumImg = document.createElement("img");
            albumImg.classList.add("moodtracks-album-img");



            var trackName = tracksToSort.items[j].name;
            var artistName = tracksToSort.items[j].artists[0].name;
            var albumURL = tracksToSort.items[j].album.images[0].url;

            trackNameSpan.textContent = trackName;
            artistNameSpan.textContent=artistName;
            albumImg.setAttribute("src", albumURL);



            trackInfoDiv.appendChild(trackNameSpan);
            trackInfoDiv.appendChild(artistNameSpan);


            if(i==1){
                moodtracksSectors[i].appendChild(albumImg);
                moodtracksSectors[i].appendChild(trackInfoDiv);
            }
            else{
                moodtracksSectors[i].appendChild(trackInfoDiv);
                moodtracksSectors[i].appendChild(albumImg);
            }
        }
    }


    //get and set artistName to a span with id moodtracks-artist
    //get and set trackName to a span with id moodtracks-artist
    //create a div called "trackInfo" append artistName and trackName
    //create an img element wit class "moodtracks-album-img"
    //create a new div called "trackRow" append trackInfo or img depending on i
    

    //append trackRow to respective div

}