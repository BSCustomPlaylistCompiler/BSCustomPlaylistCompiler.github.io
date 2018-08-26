var playlisturl = '';
var playlistName = '';
var playlistOwner = '';
var playlistZip = new JSZip();
var songsLoaded = 0;
var songsLoadNum = 0;
var songsListNum = 0;
var songsEnabled = 0;
var songsDownloaded = 0;

window.onload = function() {
	checkURL();
};

function enterURL(ele) {
    if(event.key === 'Enter') {
        submitURL(ele.value);        
    }
}

function submitURL(playlisturl) {
	if (playlisturl.toLowerCase().includes('spotify.com')) {
		window.location.href = 'spotify.html?playlisturl=' + encodeURIComponent(playlisturl);
	} else if (playlisturl.toLowerCase().includes('youtube.com')) {
		window.location.href = 'youtube.html?playlisturl=' + encodeURIComponent(playlisturl);
	}
}

function checkURL() {
	if (window.location.href.includes('playlisturl=')) {
		var origurl = decodeURIComponent(new URL(window.location.href).searchParams.get('playlisturl'));
		playlisturl = origurl.slice(0, origurl.indexOf('spotify.com/')) + 'spotify.com/embed/' + origurl.slice(origurl.indexOf('spotify.com/') + 12, origurl.length);
		getPlaylistHTML();
	} else if (window.location.href.includes('access_token=')) {
		document.getElementById('btnSpotifyAuth').style.display = 'none';
		document.getElementById('divBtnSpotifyAuthM').style.display = 'none';
		document.getElementById('title').style.paddingRight = '0px';
		playlisturl = decodeURIComponent(new URL(window.location.href.toString().replace(/#/g, '?')).searchParams.get('state'));
		getAPIJSON(new URL(window.location.href.toString().replace(/#/g, '?')), 0);
	} else if (window.location.href.includes('error=access_denied')) {
		document.getElementById('btnSpotifyAuth').style.display = 'none';
		document.getElementById('divBtnSpotifyAuthM').style.display = 'none';
		document.getElementById('title').style.paddingRight = '0px';
		document.getElementById('alertSpace').innerHTML = '<div class="w3-panel w3-red w3-card-4 w3-display-container" style="width:90%; margin-left:5%;"><span onclick="this.parentElement.style.display=\'none\'"class="w3-button w3-display-topright">&times;</span><h3>Warning!</h3><p>Spotify Authentication Error.</p></div>';
	} else {
		document.getElementById('btnSpotifyAuth').style.display = 'none';
		document.getElementById('divBtnSpotifyAuthM').style.display = 'none';
		document.getElementById('title').style.paddingRight = '0px';
		document.getElementById('alertSpace').innerHTML = '<div class="w3-panel w3-red w3-card-4 w3-display-container" style="width:90%; margin-left:5%;"><span onclick="this.parentElement.style.display=\'none\'"class="w3-button w3-display-topright">&times;</span><h3>Warning!</h3><p>No playlist URL was detected.</p></div>';
	}
}

function spotifyAuth() {
	window.location.href = 'https://accounts.spotify.com/authorize?client_id=9ada7451c6074f77a81609aacde7efb8&response_type=token&redirect_uri=' + encodeURIComponent(window.location.href.split('?')[0]) + '&state=' + encodeURIComponent(new URL(window.location.href).searchParams.get('playlisturl')) + '&scope=playlist-read-collaborative%20playlist-read-private';
}

function getPlaylistHTML() {
	myURL = playlisturl;
	var htmlFile = new XMLHttpRequest();
	htmlFile.open('GET', 'https://cors.io/?' + myURL, true);
	htmlFile.onreadystatechange = function() {
		if (htmlFile.readyState === 4) {  // Makes sure the document is ready to parse.
			if (htmlFile.status === 200) {  // Makes sure it's found the file.
				var allText = htmlFile.responseText;
				getSongs(allText, false, 0, myURL);
			} else {
				getPlaylistHTML();
			}
		}
	};
	htmlFile.send(null);
}

function getAPIJSON(myURL, offset) {
	var jsonFile = new XMLHttpRequest();
	var myPlaylistID = decodeURIComponent(myURL.searchParams.get('state'));
	jsonFile.overrideMimeType('application/json');
	var apiURL = ''
	if (myPlaylistID.includes('playlist/')){
		apiURL = 'https://api.spotify.com/v1/playlists/' + myPlaylistID.split('playlist/')[1] + '/tracks/?offset=' + offset;
	} else if (myPlaylistID.includes('album/')) {
		apiURL = 'https://api.spotify.com/v1/albums/' + myPlaylistID.split('album/')[1] + '/tracks/?offset=' + offset;
	}
	jsonFile.open('GET', apiURL, true);
	jsonFile.setRequestHeader('Authorization', 'Bearer ' + myURL.searchParams.get('access_token'));
	jsonFile.onload  = function() {
		var allText = jsonFile.responseText;
		getSongs(allText, true, offset, myURL);
	};
	jsonFile.send(null);
}

function getSongs(sourceText, loggedIn, offset, myURL) {
	var resourceJSON = null;
	var infoJSON = null;
	if (loggedIn) {
		if (JSON.parse(sourceText).hasOwnProperty('tracks')) {
			resourceJSON = JSON.parse(sourceText)['tracks'];
		} else if (JSON.parse(sourceText).hasOwnProperty('items')) {
			resourceJSON = JSON.parse(sourceText);
		}
		infoJSON = JSON.parse(sourceText);
	} else {
		var doc = new DOMParser().parseFromString(sourceText, 'text/html');
		resourceJSON = JSON.parse(doc.getElementById('resource').innerText)['tracks'];
		infoJSON = JSON.parse(doc.getElementById('resource').innerText);
	}
	console.log(JSON.stringify(infoJSON));
	playlistName = infoJSON['name'];
	playlistOwner = infoJSON['owner']['display_name'];
	document.getElementById('playlistInfo').innerText = 'Playlist - "' + playlistName + '" Owner - "' + playlistOwner + '"';
	songsListNum = parseInt(resourceJSON['total']);
	var songItems = resourceJSON['items'];
	songsLoadNum += songItems.length;
	var songNames = new Array();
	var songArtists = new Array();
	for (songItem in songItems) {
		if (playlisturl.includes('/playlist/')) {
			songNames.push(songItems[songItem]['track']['name']);
			songArtists.push(songItems[songItem]['track']['artists'][0]['name']);
		} else if (playlisturl.includes('/album/')) {
			songNames.push(songItems[songItem]['name']);
			songArtists.push(songItems[songItem]['artists'][0]['name']);
		}
	}
	for (song in songNames) {
		var filtSong = songNames[song].toLowerCase();
		if (filtSong.includes('feat.')) {
			filtSong = filtSong.slice(0, filtSong.indexOf('feat.'));
		}
		if (filtSong.includes('ft.')) {
			filtSong = filtSong.slice(0, filtSong.indexOf('ft.'));
		}
		if (filtSong.includes(' feat ')) {
			filtSong = filtSong.slice(0, filtSong.indexOf(' feat '));
		}
		if (filtSong.includes(' ft ')) {
			filtSong = filtSong.slice(0, filtSong.indexOf(' ft '));
		}
		if (filtSong.includes('(')) {
			filtSong = filtSong.slice(0, filtSong.indexOf('('));
		}
		if (filtSong.includes('/')) {
			filtSong = filtSong.slice(0, filtSong.indexOf('/'));
		}
		filtSong = filtSong.replace(/[^a-z0-9 ]/g, '');
		getBeatsaverHTML(filtSong, songNames[song], songArtists[song]);
	}
	if (loggedIn == true && offset == 0 && songsListNum > songsLoadNum) {
		for (x = 1; x < Math.ceil(songsListNum / 100); x++) {
			getAPIJSON(myURL, x * 100);
		}
	}
}

function getBeatsaverHTML(filtSong, songName, songArtist) {
	var htmlFile = new XMLHttpRequest();
	htmlFile.open('GET', 'https://cors.io/?https://www.beatsaver.com/search/all/' + encodeURIComponent(filtSong), true);
	htmlFile.onreadystatechange = function() {
		if (htmlFile.readyState === 4) {  // Makes sure the document is ready to parse.
			if (htmlFile.status === 200) {  // Makes sure it's found the file.
				var allText = htmlFile.responseText;
				displaySong(allText, songName, songArtist);
			} else {
				getBeatsaverHTML(filtSong, songName, songArtist);
			}
		}
	};
	htmlFile.send(null);
}

function displaySong(beatsaverHTML, songName, songArtist) {
	var table = document.getElementById('songTable');
	var row = table.insertRow(songsLoaded + 1);
	var songCell = row.insertCell(0);
	var artistCell = row.insertCell(1);
	var beatsaverCell = row.insertCell(2);
	var downloadCell = row.insertCell(3);
	songCell.innerHTML = songName;
	artistCell.innerHTML = songArtist;
	if (beatsaverHTML.includes('<a href="https://www.beatsaver.com/browse/detail/') || beatsaverHTML.includes('<a href="https://beatsaver.com/browse/detail/') || beatsaverHTML.includes('<a href="https://www.beatsaver.com/index.php/browse/detail/') || beatsaverHTML.includes('<a href="https://beatsaver.com/index.phpbrowse/detail/')) {
		var beatsaverCellHTML = '<select onchange="updateDownloads()" style="width: 100%;"><option value="[No Song]">[No Song]</option>';
		var defaultSet = false;
		var regex = /<a href="https:\/\/(www\.)?beatsaver\.com\/(index\.php\/)?browse\/detail\//gi, result, strIndices = [];
		while ( (result = regex.exec(beatsaverHTML)) ) {
			strIndices.push(parseInt(result.index) + 45);
		}
		var bsSongID = '';
		var bsSongName = '';
		for (arrIndex in strIndices) {
			var thisIndex = strIndices[arrIndex];
			var secondIndex = beatsaverHTML.slice(parseInt(thisIndex), beatsaverHTML.length).indexOf('"');
			bsSongID = beatsaverHTML.slice(parseInt(thisIndex), parseInt(thisIndex) + parseInt(secondIndex));
			if (bsSongID.includes('ail/')) {
				bsSongID = bsSongID.slice(4, bsSongID.length);
			}
			if (bsSongID.includes('etail/')) {
				bsSongID = bsSongID.slice(6, bsSongID.length);
			}
			var thirdIndex = beatsaverHTML.slice(parseInt(thisIndex) + parseInt(secondIndex) + 6, beatsaverHTML.length).indexOf('</h2></a>');
			bsSongName = beatsaverHTML.slice(parseInt(thisIndex) + parseInt(secondIndex) + 6, parseInt(thisIndex) + parseInt(secondIndex) + 6 + parseInt(thirdIndex));
			if (defaultSet) {
			beatsaverCellHTML += '<option value="';
			} else {
			beatsaverCellHTML += '<option selected="selected" value="';
			defaultSet = true;
			}
			beatsaverCellHTML += bsSongID + '">' + bsSongName + '</option>';
		}
		beatsaverCellHTML += '</select>';
		beatsaverCell.innerHTML = beatsaverCellHTML;
	} else {
		beatsaverCell.innerHTML = '<select style="width: 100%;"><option selected="selected" value="[No Song]">[No Song]</option></select>';
	}
	updateDownloads();
	songsLoaded += 1;
	if (songsLoaded >= songsLoadNum) {
		document.getElementById('btnDownloadAll').disabled = false;
		document.getElementById('btnDownloadBeatDrop').disabled = false;
		if (songsLoadNum < songsListNum) {
			document.getElementById('spotifyWarningSpace').innerHTML = '<div class="w3-panel w3-yellow w3-card-4 w3-display-container" style="width:90%; margin-left:5%;"><span onclick="this.parentElement.style.display=\'none\'"class="w3-button w3-display-topright">&times;</span><h3>The playlist has only loaded partially!</h3><p>Please login with Spotify to load the full playlist. (This is due to the limitations of the Spotify API)</p></div>';
		}
	}
}
	
function updateDownloads() {
	var table = document.getElementById('songTable');
	var loadedSongCount = 0;
	for (arrRow in table.rows) {
		if (arrRow != 0) {
			var myRow = table.rows[arrRow];
			var mySelect = null;
			var bsSongID = '[No Song]'
			try {
				mySelect = myRow.cells[2].getElementsByTagName('select')[0];
				bsSongID = mySelect.options[mySelect.selectedIndex].value;
			} catch (err) {}
			if (bsSongID == '[No Song]') {
				try {
					myRow.cells[3].innerHTML = 'N/A';
				} catch (err) {}
			} else {
				try {
					loadedSongCount += 1;
					myRow.cells[3].innerHTML = '<a href="https://beatsaver.com/download/' + bsSongID + '/">' + bsSongID + '</a>';
				} catch (err) {}
			}
		}
	}
	songsEnabled = loadedSongCount;
}

function downloadAll() {
	document.getElementById('btnDownloadAll').disabled = true;
	document.getElementById('btnDownloadBeatDrop').disabled = true;
	for (rowID in document.getElementById('songTable').rows) {
		if (rowID != 0) {
			try {
				document.getElementById('songTable').rows[rowID].cells[2].getElementsByTagName('select')[0].disabled = true;
			} catch (err) {}
		}
	}
	alert('Download Started - Compiling may take a few minutes...');
	songsDownloaded = 0;
	var table = document.getElementById('songTable');
	for (arrRow in table.rows) {
		if (arrRow != 0) {
			var myRow = table.rows[arrRow];
			var mySelect = null;
			try {
				mySelect = myRow.cells[2].getElementsByTagName('select')[0];
			} catch (err) {}
			var bsSongID = mySelect.options[mySelect.selectedIndex].value;
			if (bsSongID != '[No Song]') {
				downloadSong(bsSongID);
			}
		}
	}
}

function downloadSong(bsSongID) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET','https://beatsaver.com/download/' + bsSongID + '/',true);
	xhr.overrideMimeType('application/octet-stream');
	xhr.responseType = 'arraybuffer';
	xhr.onload = function (v) {
		var arrBuff = xhr.response;
		playlistZip.file(bsSongID + '.zip', arrBuff);
		songsDownloaded += 1;
		if (songsDownloaded >= songsEnabled) {
			playlistZip.generateAsync({type:'blob'}).then(function (blob) {
				saveAs(blob, "BeatSaverPlaylist.zip");
				document.getElementById('btnDownloadAll').disabled = false;
				document.getElementById('btnDownloadBeatDrop').disabled = false;
				for (rowID in document.getElementById('songTable').rows) {
					if (rowID != 0) {
						try {
							document.getElementById('songTable').rows[rowID].cells[2].getElementsByTagName('select')[0].disabled = false;
						} catch (err) {}
					}
				}
			}, function (err) {
				console.log(err);
			});
		}
	};
	xhr.onerror = function (e) {
		downloadSong(bsSongID);
	};
	xhr.send();
}

function downloadBeatDrop() {
	var beatDropJSON = JSON.parse("{}");
	beatDropJSON['playlistTitle'] = playlistName;
	beatDropJSON['playlistAuthor'] = playlistOwner;
    beatDropJSON['image'] = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QBoRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAARAAAATgAAAAAAAABgAAAAAQAAAGAAAAABcGFpbnQubmV0IDQuMC4xNgAA/9sAQwAEAwMEAwMEBAMEBQQEBQYKBwYGBgYNCQoICg8NEBAPDQ8OERMYFBESFxIODxUcFRcZGRsbGxAUHR8dGh8YGhsa/9sAQwEEBQUGBQYMBwcMGhEPERoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoa/8AAEQgBwgHCAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/P8AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK7z4O/CzUPjL48sfCGi3trp95dxTSLPdbvLURxlznaCeduK+lX/wCCbnjwKfL8W+GmbsG+0Afn5ZoA+LqK99+Kv7HnxO+EujXGt6rZWWtaLajdcXmkTtMIV/vOjKrhR3bbgdzXgVABRRRQAUUUUAFFFFABRRRQAUUV6D8Efhh/wuT4m6L4K/tX+xf7TFwftn2b7R5flQSS/wCr3LnPl4+8MZzz0oA8+ortvi98Pf8AhVPxI1/wd/aP9rf2RMkX2v7P5Hm7o1fOzc2372PvHpXE0AFFFegfB/4NeKPjb4pXQfBlsjNGglvLydis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UUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//2Q==';
	var mySongs = new Array();
	var table = document.getElementById('songTable');
	for (arrRow in table.rows) {
		if (arrRow != 0) {
			try {
				if (table.rows[arrRow].cells[3].innerHTML.toString() != 'N/A') {
					var mySongJSON = JSON.parse("{}");
					mySongJSON['key'] = table.rows[arrRow].cells[3].innerText;
					var mySelect =  table.rows[arrRow].cells[2].getElementsByTagName('select')[0];
					mySongJSON['songName'] = mySelect.options[mySelect.selectedIndex].innerText.toString();
					mySongs.push(mySongJSON);
				}
			} catch (err) {}
		}
	}
	beatDropJSON['songs'] = mySongs;
	var myFile = document.createElement('a');
	myFile.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(beatDropJSON)));
	myFile.setAttribute('download', (playlistName.replace(/[^a-zA-Z0-9]/g, '') + '.json'));
	myFile.style.display = 'none';
	document.body.appendChild(myFile);
	myFile.click();
	document.body.removeChild(myFile);
}
