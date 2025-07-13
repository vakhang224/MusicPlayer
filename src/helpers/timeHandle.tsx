export const formatSecondsToMinute = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remaining).padStart(2,'0');

    return `${formattedMinutes}:${formattedSeconds}`
}