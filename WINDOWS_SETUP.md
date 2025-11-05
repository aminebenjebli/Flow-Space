# Windows Setup Guide for Flow-Space

This guide helps Windows users set up and troubleshoot the voice-to-task feature in Flow-Space.

## Browser Compatibility

### Recommended Browsers (in order of preference)

1. **Chrome/Edge Chromium** (Best compatibility)
2. **Firefox** (Good compatibility)
3. **Edge Legacy** (Limited compatibility)

### Audio Issues Troubleshooting

#### If microphone access fails:

1. **Check browser permissions**: Make sure the browser has microphone access
2. **Windows Privacy Settings**:
   - Go to Settings > Privacy > Microphone
   - Enable "Allow apps to access your microphone"
   - Enable "Allow desktop apps to access your microphone"

#### If audio quality is poor:

1. **Update audio drivers**: Ensure your audio drivers are up to date
2. **Check sample rate**: Windows sometimes defaults to lower sample rates
   - Right-click speaker icon → Sounds → Recording tab
   - Select your microphone → Properties → Advanced
   - Try "1 channel, 16 bit, 48000 Hz" if available

#### If recording fails to start:

1. **Restart browser** completely (close all tabs and reopen)
2. **Clear browser cache** for the site
3. **Try incognito/private mode** to rule out extension conflicts

## Backend Setup (for developers)

The voice recognition uses a Python Whisper backend. Windows developers need:

### Prerequisites

- **Python 3.8+** (from python.org, not Microsoft Store version)
- **FFmpeg** installed and in PATH
- **Git** for cloning repositories

### Quick Setup

```bash
# 1. Install FFmpeg (using Chocolatey - easiest method)
choco install ffmpeg

# Or download manually from: https://ffmpeg.org/download.html
# Extract to C:\ffmpeg and add C:\ffmpeg\bin to PATH

# 2. Verify FFmpeg installation
ffmpeg -version

# 3. Install Python dependencies (in your backend directory)
pip install openai-whisper
pip install ffmpeg-python

# 4. Test Whisper locally
python -c "import whisper; print('Whisper installed successfully')"
```

### Environment Variables (Optional)

Create a `.env` file in your backend directory:

```
# Only needed if FFmpeg is not in PATH or you want custom paths
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
PYTHON_COMMAND=python
WHISPER_MODEL=base
```

## Common Windows Issues

### Issue: "MediaDevices not supported"

**Solution**: Use HTTPS or localhost. Modern browsers require secure contexts for microphone access.

### Issue: Audio cuts out or stops unexpectedly

**Solution**:

1. Close other applications using the microphone (Teams, Zoom, etc.)
2. Try a different USB port for USB microphones
3. Disable "Allow applications to take exclusive control" in microphone properties

### Issue: Poor transcription quality

**Solutions**:

1. **Speak clearly** and closer to the microphone
2. **Reduce background noise** - close windows, move to quieter room
3. **Check microphone levels** - should be around 70-80% in Windows settings
4. **Use a headset** instead of laptop built-in microphone

### Issue: Long processing times

**Solutions**:

1. **Shorter recordings** - try 10-15 seconds instead of longer clips
2. **Better hardware** - SSD and more RAM help with processing
3. **Close other apps** to free up system resources

## Testing Your Setup

1. **Open the app** in Chrome/Edge
2. **Click the microphone button**
3. **Allow microphone permissions**
4. **Speak for 5-10 seconds**: "Create a task to review the quarterly report by Friday"
5. **Click stop** and wait for transcription
6. **Check** that text appears and gets inserted into the task form

## Browser Developer Tools

If you encounter issues, open Developer Tools (F12) and check the Console tab for error messages. Common patterns:

- `MediaDevices not supported` = Use HTTPS or localhost
- `Permission denied` = Check browser and Windows microphone permissions
- `AudioContext` errors = Try restarting the browser
- `Network timeout` = Backend processing is slow, wait longer

## Performance Tips

### For better performance on Windows:

1. **Close unnecessary tabs** - each tab uses memory
2. **Use Chrome's hardware acceleration** (enabled by default)
3. **Ensure good internet connection** for API calls
4. **Consider using Edge** instead of Chrome for better Windows integration

### For better transcription accuracy:

1. **Speak at normal pace** - not too fast or slow
2. **Use punctuation words** - say "comma", "period", "question mark"
3. **Speak in shorter sentences** - easier for AI to process
4. **Avoid filler words** - "um", "uh", "like" can confuse transcription

## Need Help?

If you're still having issues:

1. Check the GitHub issues for similar problems
2. Share your browser Console logs when reporting issues
3. Include your Windows version and browser version
4. Test with a simple "Hello world" recording first

The system is designed to be forgiving and work on most Windows setups, but audio hardware can be finicky. When in doubt, try Chrome on a wired headset first!
