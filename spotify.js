var playlisturl = '';
var playlistZip = new JSZip();
var songsLoaded = 0;
var songsLoadNum = 0;
var songsListNum = 0;
var songsEnabled = 0;
var songsDownloaded = 0;
checkURL();
window.setTimeout(checkRefresh, 15000);

function checkRefresh() {
	if (document.getElementById('songTable').rows.length == 1) {
		console.log('reload');
		location.reload();
	}
}

function checkURL() {
	if (window.location.href.includes('playlisturl=')) {
		getPlaylistHTML();
	} else if (window.location.href.includes('access_token=')) {
		getAPIJSON(new URL(window.location.href.toString().replace(/#/g, '?')));
	} else if (window.location.href.includes('error=access_denied')) {
		alert('Spotify authentication error.');
	} else {
		alert('No playlist URL was detected');
	}
}

function getURL() {
	var origurl = decodeURIComponent(new URL(window.location.href).searchParams.get('playlisturl'));
	playlisturl = origurl.slice(0, origurl.indexOf('spotify.com/')) + 'spotify.com/embed/' + origurl.slice(origurl.indexOf('spotify.com/') + 12, origurl.length);
	return playlisturl;
}

function spotifyAuth() {
	window.location.href = 'https://accounts.spotify.com/authorize?client_id=9ada7451c6074f77a81609aacde7efb8&response_type=token&redirect_uri=' + encodeURIComponent(window.location.href.split('?')[0]) + '&state=' + encodeURIComponent(new URL(window.location.href).searchParams.get('playlisturl')) + '&scope=playlist-read-collaborative%20playlist-read-private';
}

function getPlaylistHTML() {
	var htmlFile = new XMLHttpRequest();
	htmlFile.open('GET', 'https://cors.io/?' + getURL(), true);
	htmlFile.onreadystatechange = function() {
		if (htmlFile.readyState === 4) {  // Makes sure the document is ready to parse.
			if (htmlFile.status === 200) {  // Makes sure it's found the file.
				var allText = htmlFile.responseText;
				getSongs(allText);
			} else {
				getPlaylistHTML();
			}
		}
	};
	htmlFile.send(null);
}

function getAPIJSON(myURL) {
	var jsonFile = new XMLHttpRequest();
	var myPlaylistID = decodeURIComponent(myURL.searchParams.get('state'));
	jsonFile.overrideMimeType('application/json');
	if (myPlaylistID.includes('playlist/')){
		myPlaylistID = myPlaylistID.split('playlist/')[1];
		jsonFile.open('GET', 'https://api.spotify.com/v1/playlists/' + myPlaylistID + '/tracks', true);
	} else if (myPlaylistID.includes('album/')) {
		myPlaylistID = myPlaylistID.split('album/')[1];
		jsonFile.open('GET', 'https://api.spotify.com/v1/albums/' + myPlaylistID + '/tracks', true);
	}
	jsonFile.setRequestHeader('Authorization', myURL.searchParams.get('access_token'));
	jsonFile.onload  = function() {
		var allText = JSON.parse(req.responseText);
		console.log(allText);
	};
	jsonFile.send(null);
}

function getSongs(sourceHTML) {
	var doc = new DOMParser().parseFromString(sourceHTML, 'text/html');
	var resourceJSON = JSON.parse(doc.getElementById('resource').innerText);
	songsListNum = parseInt(resourceJSON['tracks']['total']);
	var songItems = resourceJSON['tracks']['items'];
	songsLoadNum = songItems.length;
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
	if (songsLoaded == songsLoadNum) {
		document.getElementById('btnDownloadAll').disabled = false;
		if (songsLoadNum < songsListNum) {
			alert('The playlist has only loaded partially. Please login with Spotify to load the full playlist. (This is due to the limitations of the Spotify API)');
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
			try {
				mySelect = myRow.cells[2].getElementsByTagName('select')[0];
			} catch (err) {}
			var bsSongID = mySelect.options[mySelect.selectedIndex].value;
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
