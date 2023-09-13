let clientId, apiScope, redirectUri;

await fetch('/.netlify/functions/apitoken')
  .then((response) => response.json())
  .then((data) => {
    clientId = data.CLIENT_ID;
    apiScope = data.API_SCOPE;
    redirectUri = data.REDIRECT_URI;
    console.log(clientId);
  })
  .catch((error) => {
    // Handle errors.
    console.error(error);
  });

const trackLimit = '50';
const displayedTrackListLimit = 10;

var shortTermUserTracks;
var mediumTermUserTracks;
var longTermUserTracks;
var fullUserTrackList = [];

var shortTermButtonTT = document.querySelector('#top-tracks-past-month-button');
var mediumTermButtonTT = document.querySelector('#top-tracks-past-six-months-button');
var longTermButtonTT = document.querySelector('#top-tracks-all-time-button');
var topTracksOptionsButtons = [shortTermButtonTT,mediumTermButtonTT, longTermButtonTT];

var shortTermButtonMT = document.querySelector('#moodtracks-past-month-button');
var medTermButtonMT = document.querySelector('#moodtracks-past-six-months-button');
var longTermButtonMT = document.querySelector('#moodtracks-all-time-button');
var mtOptionsButtons = [shortTermButtonMT, medTermButtonMT, longTermButtonMT];

var rareTracksRefreshButton = document.querySelector('#rare-tracks-refresh-button');

const urlParams = new URLSearchParams(window.location.search);
let code = urlParams.get('code');

if (!localStorage.getItem('refresh_token') && !code) {
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
    var body;

    if(localStorage.getItem("refresh_token") != null){
        console.log("refreshed token");
        body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token:localStorage.getItem("refresh_token"), 
            client_id: clientId
        });
    }
    else{
        body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier
        });
    }

    await fetch('https://accounts.spotify.com/api/token', {
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
            localStorage.setItem('refresh_token', data.refresh_token);
        })
        .catch(error => {
            console.error('Error:', error);
        });



    //populating variables that will be used throught this script. 
    //gets users short/medium/long term top tracks and populates them on UI
    shortTermUserTracks = await getUserTopTracks('short_term', trackLimit);
    mediumTermUserTracks = await getUserTopTracks('medium_term', trackLimit);
    longTermUserTracks = await getUserTopTracks('long_term', trackLimit);
    populateTopTracks(shortTermUserTracks, "short");
    addTopTracksEventListeners()

    //fetches song features from top tracks and creates copies of arrays to sort them based on attributes
    var valenceTFPShort = await getTrackFeaturePairArr(shortTermUserTracks);
    var energyTFPShort = JSON.parse(JSON.stringify(valenceTFPShort));
    var danceTFPShort = JSON.parse(JSON.stringify(valenceTFPShort));

    var valenceTFPMed = await getTrackFeaturePairArr(mediumTermUserTracks);
    var energyTFPMed = JSON.parse(JSON.stringify(valenceTFPMed));
    var danceTFPMed = JSON.parse(JSON.stringify(valenceTFPMed));

    var valenceTFPLong = await getTrackFeaturePairArr(longTermUserTracks);
    var energyTFPLong = JSON.parse(JSON.stringify(valenceTFPLong));
    var danceTFPLong = JSON.parse(JSON.stringify(valenceTFPLong));
    
    //by default, the short term tracks are shown. we sort these so that they are populated in order. 
    quickSortValence(valenceTFPShort, 0, valenceTFPShort.length-1);
    quickSortEnergy(energyTFPShort, 0, energyTFPShort.length-1);
    quickSortDance(danceTFPShort, 0, danceTFPShort.length-1);

    quickSortValence(valenceTFPMed, 0, valenceTFPMed.length-1);
    quickSortEnergy(energyTFPMed, 0, energyTFPMed.length-1);
    quickSortDance(danceTFPMed, 0, danceTFPMed.length-1);

    quickSortValence(valenceTFPLong, 0, valenceTFPLong.length-1);
    quickSortEnergy(energyTFPLong, 0, energyTFPLong.length-1);
    quickSortDance(danceTFPLong, 0, danceTFPLong.length-1);

    //updates UI to populate moodtracks card and adds event listeners to buttons on card.
    populateMoodtracks(await valenceTFPShort, await energyTFPShort, await danceTFPShort);
    document.getElementById("moodtracks-loading-text").remove()
    addMoodtracksEventListeners();
    
    quickSortLibrary(await saveUserLibraryStartingFrom(0, 2), 0, fullUserTrackList.length-1);
    console.log(fullUserTrackList);
    await populateRareTracks();
    document.getElementById("rare-tracks-loading-text").remove();
}

// Event listeners for option buttons in top tracks card. Handle updating the top tracks card. 
function addTopTracksEventListeners(){
    shortTermButtonTT.addEventListener('click', function () {
        populateTopTracks(shortTermUserTracks, "short");
        removeButtonHighlightFrom(topTracksOptionsButtons,"top-tracks");
        shortTermButtonTT.classList.add("selected-top-tracks-option");
    });

    mediumTermButtonTT.addEventListener('click', function () {
        populateTopTracks(mediumTermUserTracks, "medium");
        removeButtonHighlightFrom(topTracksOptionsButtons,"top-tracks");
        mediumTermButtonTT.classList.add("selected-top-tracks-option");
    });

    longTermButtonTT.addEventListener('click', function () {
        populateTopTracks(longTermUserTracks, "long");
        removeButtonHighlightFrom(topTracksOptionsButtons,"top-tracks");
        longTermButtonTT.classList.add("selected-top-tracks-option");
    });
}

// Event listeners for option buttons in moodtracks card
function addMoodtracksEventListeners(){
    
    shortTermButtonMT.addEventListener('click', function () {
        populateMoodtracks(valenceTFPShort, energyTFPShort, danceTFPShort);
        removeButtonHighlightFrom(mtOptionsButtons,"moodtracks");
        shortTermButtonMT.classList.add("selected-moodtracks-option");
    });

    
    medTermButtonMT.addEventListener('click', function () {
        populateMoodtracks(valenceTFPMed, energyTFPMed, danceTFPMed);
        removeButtonHighlightFrom(mtOptionsButtons,"moodtracks");
        medTermButtonMT.classList.add("selected-moodtracks-option");
    });

    
    longTermButtonMT.addEventListener('click', function () {
        populateMoodtracks(valenceTFPLong, energyTFPLong, danceTFPLong);
        removeButtonHighlightFrom(mtOptionsButtons,"moodtracks");
        longTermButtonMT.classList.add("selected-moodtracks-option");
    });
}


function removeButtonHighlightFrom(buttonArr, card){
    for(var i = 0; i<buttonArr.length;i++){
        switch(card){
            case "top-tracks":
                buttonArr[i].classList.remove("selected-top-tracks-option");
                break;
            case "moodtracks":
                buttonArr[i].classList.remove("selected-moodtracks-option");
                break;
            case "rare-tracks":
                buttonArr[i].classList.remove("selected-top-tracks-option");
                break;
        }
        
    }
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
    console.log(apiCall);

    const response = await fetch(apiCall, {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });

    

    return await response.json();
}

async function getResponse(apiCall){
    let accessToken = localStorage.getItem('access_token');
    console.log(apiCall);

    const response = await fetch(apiCall, {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });

    return await response.json();
}

async function saveUserLibraryStartingFrom(offset, limit, recursiveCalls=0){
    var userLibrarySegment = await getResponse('https://api.spotify.com/v1/me/tracks?limit=50&offset='+offset);
    recursiveCalls++;
    console.log("The recursive call is" + recursiveCalls);

    for(var i = 0; i < userLibrarySegment.items.length; i++){
        fullUserTrackList.push(userLibrarySegment.items[i]);
    }

    if(recursiveCalls == limit){
        return fullUserTrackList;
    }
    else if(userLibrarySegment.next != null){
        return await saveUserLibraryStartingFrom(offset+50, limit, recursiveCalls);
    }
    else{
        return fullUserTrackList;
    }
}

function quickSortLibrary(arr, first, last){
    if(first < last){
        const pivot = partitionLibrary(arr, first, last);
        quickSortLibrary(arr, first, pivot-1);
        quickSortLibrary(arr, pivot+1,last);
    }
}

function partitionLibrary(arr, first, last){
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

function quickSortValence(arr, first, last){
    if(first < last){
        const pivot = partitionValence(arr, first, last);
        quickSortValence(arr, first, pivot-1);
        quickSortValence(arr, pivot+1,last);
    }
}

function partitionValence(arr, first, last){
    swap(arr, Math.floor(((last-first)/2) + first), last);
    const pivotVal = arr[last][1].valence;
    var i = first-1;

    for(var j = first; j<last; j++){
        if(arr[j][1].valence <= pivotVal){
            i++;
            swap(arr, i, j);
        }
    }
    var pivotPos = i+1
    swap(arr, last, pivotPos);
    return pivotPos
}

function quickSortEnergy(arr, first, last){
    if(first < last){
        const pivot = partitionEnergy(arr, first, last);
        quickSortEnergy(arr, first, pivot-1);
        quickSortEnergy(arr, pivot+1,last);
    }
}

function partitionEnergy(arr, first, last){
    swap(arr, Math.floor(((last-first)/2) + first), last);
    const pivotVal = arr[last][1].energy;
    var i = first-1;

    for(var j = first; j<last; j++){
        if(arr[j][1].energy <= pivotVal){
            i++;
            swap(arr, i, j);
        }
    }
    var pivotPos = i+1
    swap(arr, last, pivotPos);
    return pivotPos
}

function quickSortDance(arr, first, last){
    if(first < last){
        const pivot = partitionDance(arr, first, last);
        quickSortDance(arr, first, pivot-1);
        quickSortDance(arr, pivot+1,last);
    }
}

function partitionDance(arr, first, last){
    swap(arr, Math.floor(((last-first)/2) + first), last);
    const pivotVal = arr[last][1].danceability;
    var i = first-1;

    for(var j = first; j<last; j++){
        if(arr[j][1].danceability <= pivotVal){
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

async function getSongFeaturesWithID(id){
    
    var apicall = "https://api.spotify.com/v1/audio-features?ids=" + id;
    return await getResponse(apicall);
}

async function getTrackFeaturePairArr(tracks){
    var trackFeaturePair = [];
    var idList = "";
    
    for(var j = 0; j<50; j++){
        idList = idList + tracks.items[j].id + ",";   
    }

    idList = idList.substring(0,idList.length-1);

    var response = await getSongFeaturesWithID(idList);

    for(var i =0; i<response.audio_features.length; i++){
        //console.log(tracks.items[i].name);
        //console.log(response.audio_features[i].uri);
        
        trackFeaturePair.push([tracks.items[i], response.audio_features[i]]);
    }

    return trackFeaturePair;
}


/* valenceTrackfeaturePair and energyTrackFeaturePair must be sorted already.
 * Populates moodtracks
 */
async function populateMoodtracks(valenceTrackFeaturePair, energyTrackFeaturePair, danceTrackFeaturePair){
    const valenceListLength = valenceTrackFeaturePair.length;
    const energyListLength = energyTrackFeaturePair.length;
    
    var topHappySongs = [   valenceTrackFeaturePair[valenceListLength-1][0],
                            valenceTrackFeaturePair[valenceListLength-2][0],
                            valenceTrackFeaturePair[valenceListLength-3][0] ];

    var topTenderSongs = [  energyTrackFeaturePair[0][0],
                            energyTrackFeaturePair[1][0],
                            energyTrackFeaturePair[2][0]];

    var topEnergeticSongs = [   energyTrackFeaturePair[energyListLength-1][0],
                                energyTrackFeaturePair[energyListLength-2][0],
                                energyTrackFeaturePair[energyListLength-3][0]];;
    


    var happyGrid = document.getElementById("moodtracks-happy-grid");
    var tenderGrid = document.getElementById("moodtracks-tender-grid");
    var energeticGrid = document.getElementById("moodtracks-energetic-grid");

    var moodtracksSectors = [happyGrid,tenderGrid,energeticGrid];

    for(var i =0; i< 3; i++){
        moodtracksSectors[i].innerHTML = "";
        for(var j = 0; j<3;j++){
            var trackNameSpan = document.createElement("span");
            var artistNameSpan = document.createElement("span");
            trackNameSpan.setAttribute("id", "moodtracks-track");
            artistNameSpan.setAttribute("id", "moodtracks-artist");


            var trackInfoDiv = document.createElement("a");
            trackInfoDiv.classList.add("moodtracks-track-info");
            var albumImg = document.createElement("img");
            albumImg.classList.add("moodtracks-album-img");

            switch(i) {
                case 0:
                    var trackName = topHappySongs[j].name;
                    var artistName = topHappySongs[j].artists[0].name;
                    var albumURL = topHappySongs[j].album.images[0].url;
                    var externalURL = topHappySongs[j].external_urls.spotify;
                    break;
                case 1:
                    var trackName = topTenderSongs[j].name;
                    var artistName = topTenderSongs[j].artists[0].name;
                    var albumURL = topTenderSongs[j].album.images[0].url;
                    var externalURL = topTenderSongs[j].external_urls.spotify;
                    break;
                case 2:
                    var trackName = topEnergeticSongs[j].name;
                    var artistName = topEnergeticSongs[j].artists[0].name;
                    var albumURL = topEnergeticSongs[j].album.images[0].url;
                    var externalURL = topEnergeticSongs[j].external_urls.spotify;
                    break;
            }

            //adding content for track name, track artist, and album artwork. 
            trackNameSpan.textContent = trackName;
            artistNameSpan.textContent = artistName;
            albumImg.setAttribute("src", albumURL);

            //Adding hyperlinks to Spotify metadata
            var albumImgAnchor = document.createElement("a");
            albumImgAnchor.setAttribute("href", externalURL);
            albumImgAnchor.appendChild(albumImg)
            trackInfoDiv.setAttribute("href", externalURL);

            //appending name and artist to trackInfo
            trackInfoDiv.appendChild(trackNameSpan);
            trackInfoDiv.appendChild(artistNameSpan);


            if(i==1){
                moodtracksSectors[i].appendChild(albumImgAnchor);
                moodtracksSectors[i].appendChild(trackInfoDiv);

                
            }
            else{
                moodtracksSectors[i].appendChild(trackInfoDiv);
                moodtracksSectors[i].appendChild(albumImgAnchor);
            }
        }
    }

    adjustFontSizingMoodtracks(45.10, 10);
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
        if(fullUserTrackList[libraryIndex].track.popularity >= 1){
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
        externalURL = topThree[i].track.external_urls.spotify;

        if(i == 0){
            document.getElementById("rare-track-1-a").setAttribute("href", externalURL);
            track1.appendChild(trackName);
            track1.appendChild(artistName);
        }
        if(i == 1){
            document.getElementById("rare-track-2-a").setAttribute("href", externalURL);
            track2.appendChild(trackName);
            track2.appendChild(artistName);
        }
        if(i == 2){
            document.getElementById("rare-track-3-a").setAttribute("href", externalURL);
            track3.appendChild(trackName);
            track3.appendChild(artistName);
        }
    }

    img1.setAttribute("src", topThree[0].track.album.images[1].url);
    img2.setAttribute("src", topThree[1].track.album.images[1].url);
    img3.setAttribute("src", topThree[2].track.album.images[1].url);
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
function adjustFontSizingMoodtracks(threshold, newFontSize){
    var isDone = 1;
    var elmnt = document.getElementsByClassName("moodtracks-track-info");
    newFontSize = newFontSize - 2;

    for(var i = 0; i < elmnt.length; i++){
        if(elmnt[i].offsetHeight > threshold){
            var spans = elmnt[i].getElementsByTagName("span");
            for (var j = 0; j < spans.length; j++) {
                spans[j].style.fontSize = newFontSize + "px";
            }
            isDone = 0;
        }
    }

    if(!isDone){
        adjustFontSizingMoodtracks(threshold, newFontSize);
    }
}

function getFilteredTrackFeaturePair(tfp, minValence, minEnergy, moreThanLimit){
    var filteredList = [];

    if(moreThanLimit){
        for(var i =0; i < tfp.length; i++){
            if(tfp[i][1].valence >= minValence && tfp[i][1].energy >= minEnergy){
                filteredList.push(tfp[i]);
            }
        }
    }
    else{
        for(var i =0; i < tfp.length; i++){
            if(tfp[i][1].valence < minValence && tfp[i][1].energy < minEnergy){
                filteredList.push(tfp[i]);
            }
        }
    }

    return filteredList;
}
