declare module 'lavaplayer-track-info' {
	export interface Track {
		//
	}

	export function decodeTrack(track: string | Buffer): Track;
}
