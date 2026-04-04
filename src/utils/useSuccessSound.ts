import { useEffect, useRef } from 'react';
import Sound from 'react-native-sound';

// Required on iOS to allow sound to play even when the device is on silent.
// Call once at module level — not inside the component.
Sound.setCategory('Playback');

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Loads the sound file once on mount, releases it on unmount.
// Call play() after a successful API call to trigger the sound.
//
// Usage:
//   const { play } = useSuccessSound();
//   await createInvoice(payload);
//   play();
//
// Sound file location:
//   Android → android/app/src/main/res/raw/success.mp3
//   iOS     → ios/YourApp/success.mp3  (add via Xcode, check "Copy items if needed")

export const useSuccessSound = (filename = 'notification.mp3') => {
  const soundRef = useRef<Sound | null>(null);

  useEffect(() => {
    // Load the sound file from the app bundle
    const sound = new Sound(filename, Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.warn(`useSuccessSound: failed to load "${filename}"`, error);
      }
    });

    soundRef.current = sound;

    // Release the audio resource when the component unmounts
    return () => {
      sound.release();
    };
  }, [filename]);

  const play = () => {
    const sound = soundRef.current;
    if (!sound) return;

    // Stop any currently playing instance before replaying —
    // prevents overlap if the user triggers the action twice quickly.
    sound.stop(() => {
      sound.play(success => {
        if (!success) {
          console.warn('useSuccessSound: playback failed (audio decode error)');
        }
      });
    });
  };

  return { play };
};
