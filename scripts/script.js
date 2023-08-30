const clientId = "0398c81e44224813ba198d3e48e98556"; // Replace with your client ID
const redirectUri = "http://localhost:5500/yourmoodtracks.html";
const apiScope = "user-read-private user-read-email user-top-read user-library-read";

var trackScope = 'short_term';
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
    populateTopTracks(shortTermUserTracks, "short");
    addTopTracksEventListeners()

    var valenceTFPShort = await getTrackFeaturePairArr(shortTermUserTracks);
    var energyTFPShort = JSON.parse(JSON.stringify(valenceTFPShort));

    
    var valenceTFPMed = await getTrackFeaturePairArr(mediumTermUserTracks);
    var energyTFPMed = JSON.parse(JSON.stringify(valenceTFPMed));

    var valenceTFPLong = await getTrackFeaturePairArr(longTermUserTracks);
    var energyTFPLong = JSON.parse(JSON.stringify(valenceTFPLong));
    
    quickSortValence(valenceTFPShort, 0, valenceTFPShort.length-1);
    quickSortEnergy(energyTFPShort, 0, energyTFPShort.length-1);

    populateMoodtracks(await valenceTFPShort, await energyTFPShort);
    document.getElementById("moodtracks-loading-text").remove()
    addMoodtracksEventListeners();
    
    //quickSort(await saveUserLibraryStartingFrom(0), 0, fullUserTrackList.length-1);
    //await populateRareTracks();
    //document.getElementById("#rare-tracks-loading-text").remove()
    

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
        populateMoodtracks(valenceTFPShort, energyTFPShort);
        removeButtonHighlightFrom(mtOptionsButtons,"moodtracks");
        shortTermButtonMT.classList.add("selected-moodtracks-option");
    });

    
    medTermButtonMT.addEventListener('click', function () {
        populateMoodtracks(valenceTFPMed, energyTFPMed);
        removeButtonHighlightFrom(mtOptionsButtons,"moodtracks");
        medTermButtonMT.classList.add("selected-moodtracks-option");
    });

    
    longTermButtonMT.addEventListener('click', function () {
        populateMoodtracks(valenceTFPLong, energyTFPLong);
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
        return fullUserTrackList;
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

function quickSortValence(arr, first, last){
    if(first < last){
        const pivot = partitionValence(arr, first, last);
        quickSortValence(arr, first, pivot-1);
        quickSortValence(arr, pivot+1,last);
    }
}

function partitionValence(arr, first, last){
    //console.log("this is the last element");
    //console.log(arr[last]);
    swap(arr, Math.floor(((last-first)/2) + first), last);
    const pivotVal = arr[last][1].valence;
    //console.log("The pivot value is " + pivotVal.toString());
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
    //console.log("The pivot value is " + pivotVal.toString());
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


function swap(arr, i, j){
    const tempVal = arr[i];
    arr[i] = arr[j];
    arr[j] = tempVal;
}

async function getSongFeaturesWithID(id){
    
    var apicall = "https://api.spotify.com/v1/audio-features?ids=" + id;
    console.log(apicall);
    return await getResponse(apicall);
}

async function getTrackFeaturePairArr(tracks){
    var trackFeaturePair = [];
    var idList = "";

    console.log(tracks.items.length);
    

    for(var j = 0; j<50; j++){
        console.log(j);
        idList = idList + tracks.items[j].id + ",";   
    }

    console.log(idList);
    idList = idList.substring(0,idList.length-1);
    console.log(idList);


    var response = await getSongFeaturesWithID(idList);
    console.log(response);

    for(var i =0; i<response.audio_features.length; i++){
        trackFeaturePair.push([tracks.items[i], response.audio_features[i]]);
    }

    console.log(trackFeaturePair);
    return trackFeaturePair;
}

async function populateMoodtracks(valenceTrackFeaturePair, energyTrackFeaturePair){
    console.log("populating moodtracks");
    console.log(valenceTrackFeaturePair);
    console.log(energyTrackFeaturePair);

    const valenceListLength = valenceTrackFeaturePair.length;
    const energyListLength = energyTrackFeaturePair.length;


    var topHappySongs = [valenceTrackFeaturePair[valenceListLength-1][0],valenceTrackFeaturePair[valenceListLength-2][0],valenceTrackFeaturePair[valenceListLength-3][0]];;
    var topTenderSongs = [energyTrackFeaturePair[0][0],energyTrackFeaturePair[1][0],energyTrackFeaturePair[2][0]];
    var topEnergeticSongs = [energyTrackFeaturePair[energyListLength-1][0],energyTrackFeaturePair[energyListLength-2][0],energyTrackFeaturePair[energyListLength-3][0]];;


    var happyGrid = document.getElementById("moodtracks-happy-grid");
    var tenderGrid = document.getElementById("moodtracks-tender-grid");
    var energeticGrid = document.getElementById("moodtracks-energetic-grid");

    var moodtracksSectors = [happyGrid,tenderGrid,energeticGrid];

    console.log(moodtracksSectors);
    console.log(topHappySongs);

    


    for(var i =0; i< 3; i++){
        moodtracksSectors[i].innerHTML = "";
        for(var j = 0; j<3;j++){
            var trackNameSpan = document.createElement("span");
            var artistNameSpan = document.createElement("span");
            trackNameSpan.setAttribute("id", "moodtracks-track");
            artistNameSpan.setAttribute("id", "moodtracks-artist");

            var trackInfoDiv = document.createElement("div");
            trackInfoDiv.classList.add("moodtracks-track-info")
            var albumImg = document.createElement("img");
            albumImg.classList.add("moodtracks-album-img");

            switch(i) {
                case 0:
                    var trackName = topHappySongs[j].name;
                    var artistName = topHappySongs[j].artists[0].name;
                    var albumURL = topHappySongs[j].album.images[0].url;
                    break;
                case 1:
                    var trackName = topTenderSongs[j].name;
                    var artistName = topTenderSongs[j].artists[0].name;
                    var albumURL = topTenderSongs[j].album.images[0].url;
                    break;
                case 2:
                    var trackName = topEnergeticSongs[j].name;
                    var artistName = topEnergeticSongs[j].artists[0].name;
                    var albumURL = topEnergeticSongs[j].album.images[0].url;
                    break;
            }

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
        if(fullUserTrackList[libraryIndex].track.popularity >= 0){
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
    console.log(newFontSize)
    var isDone = 1;
    var elmnt = document.getElementsByClassName("moodtracks-track-info");
    newFontSize = newFontSize - 2;

    for(var i = 0; i < elmnt.length; i++){
        console.log(elmnt[i].textContent);
        console.log(elmnt[i].offsetHeight);
        console.log(threshold);
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
