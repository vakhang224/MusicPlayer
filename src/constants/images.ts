import unknownArtistImage from '@/assets/unknown_artist.png';
import unknownTracksImage from '@/assets/unknown_track.png';
import { Image } from 'react-native';

export const unknownArtistImageUri = Image.resolveAssetSource(unknownArtistImage).uri;
export const unknownTracksImageUri = Image.resolveAssetSource(unknownTracksImage).uri;