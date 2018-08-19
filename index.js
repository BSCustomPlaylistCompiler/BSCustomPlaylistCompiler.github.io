submitURL(decodeURIComponent(new URL(window.location.href).searchParams.get('playlisturl')));

function submitURL(playlisturl) {
	if (playlisturl.toLowerCase().includes('spotify.com')) {
		window.location.href = 'spotify.html?playlisturl=' + encodeURIComponent(playlisturl);
	} else if (playlisturl.toLowerCase().includes('youtube.com')) {
		window.location.href = 'youtube.html?playlisturl=' + encodeURIComponent(playlisturl);
	}
}
