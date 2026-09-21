#!/usr/bin/env python3
import os
import math
import wave
import struct
import random

SAMPLE_RATE = 44100

def create_wav(filename, samples):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        # Normalize to prevent clipping
        max_val = max(abs(s) for s in samples) if samples else 1.0
        if max_val > 0.98:
            norm_factor = 0.95 / max_val
            samples = [s * norm_factor for s in samples]
        raw_data = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            int_val = int(clamped * 32767.0)
            raw_data.extend(struct.pack('<h', int_val))
        wav_file.writeframes(raw_data)

def generate_move():
    # Realistic solid wooden piece thud (~120ms)
    duration = 0.13
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # 1. Click/friction transient (first 25ms)
        click = (random.random() * 2 - 1) * math.exp(-t * 120.0) * 0.45
        # 2. Main wood body pitch drop (320Hz -> 100Hz)
        freq = 100.0 + 220.0 * math.exp(-t * 45.0)
        body = math.sin(2 * math.pi * freq * t) * math.exp(-t * 35.0) * 0.7
        # 3. Low hollow resonance (85Hz)
        hollow = math.sin(2 * math.pi * 85.0 * t) * math.exp(-t * 28.0) * 0.35
        samples.append(click + body + hollow)
    return samples

def generate_capture():
    # Crisp piece capture knock: piece click + board thud (~160ms)
    duration = 0.16
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Initial piece collision click (0 - 40ms)
        click1 = (random.random() * 2 - 1) * math.exp(-t * 150.0) * 0.55
        freq1 = 520.0 * math.exp(-t * 50.0)
        knock1 = math.sin(2 * math.pi * freq1 * t) * math.exp(-t * 55.0) * 0.75

        # Secondary piece settling (at t = 0.035s)
        t2 = max(0.0, t - 0.035)
        click2 = (random.random() * 2 - 1) * math.exp(-t2 * 90.0) * 0.35 if t >= 0.035 else 0.0
        freq2 = 180.0 * math.exp(-t2 * 30.0)
        knock2 = math.sin(2 * math.pi * freq2 * t2) * math.exp(-t2 * 30.0) * 0.6 if t >= 0.035 else 0.0

        samples.append(click1 + knock1 + click2 + knock2)
    return samples

def generate_check():
    # Clear chime/bell (G5: 783.99Hz + C6: 1046.5Hz) (~420ms)
    duration = 0.42
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # First bell G5
        tone1 = (math.sin(2 * math.pi * 783.99 * t) + 0.3 * math.sin(2 * math.pi * 1567.98 * t)) * math.exp(-t * 8.0)
        # Second bell C6 (enters at 60ms)
        t2 = max(0.0, t - 0.06)
        tone2 = (math.sin(2 * math.pi * 1046.5 * t2) + 0.25 * math.sin(2 * math.pi * 2093.0 * t2)) * math.exp(-t2 * 6.5) if t >= 0.06 else 0.0
        samples.append(tone1 * 0.45 + tone2 * 0.55)
    return samples

def generate_checkmate():
    # Majestic triumphant resolving chord: C4, G4, C5, E5, G5 (~1.3s)
    duration = 1.3
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    chord_freqs = [261.63, 392.00, 523.25, 659.25, 783.99]
    delays = [0.0, 0.04, 0.08, 0.12, 0.16]
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        # Initial subtle wood knock
        if t < 0.08:
            val += (random.random() * 2 - 1) * math.exp(-t * 90.0) * 0.3
            val += math.sin(2 * math.pi * 180.0 * t) * math.exp(-t * 40.0) * 0.4

        for freq, d in zip(chord_freqs, delays):
            if t >= d:
                local_t = t - d
                decay = math.exp(-local_t * 2.8)
                note = (math.sin(2 * math.pi * freq * local_t) +
                        0.25 * math.sin(2 * math.pi * freq * 2 * local_t) +
                        0.1 * math.sin(2 * math.pi * freq * 3 * local_t)) * decay
                val += note * 0.22
        samples.append(val)
    return samples

def generate_castle():
    # Distinct double-thud: King step then Rook step (~240ms)
    duration = 0.25
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # First thud (King)
        click1 = (random.random() * 2 - 1) * math.exp(-t * 120.0) * 0.4
        freq1 = 120.0 + 180.0 * math.exp(-t * 45.0)
        thud1 = math.sin(2 * math.pi * freq1 * t) * math.exp(-t * 40.0) * 0.7

        # Second thud (Rook at t = 0.10s)
        t2 = max(0.0, t - 0.10)
        click2 = (random.random() * 2 - 1) * math.exp(-t2 * 130.0) * 0.45 if t >= 0.10 else 0.0
        freq2 = 130.0 + 200.0 * math.exp(-t2 * 45.0)
        thud2 = math.sin(2 * math.pi * freq2 * t2) * math.exp(-t2 * 40.0) * 0.75 if t >= 0.10 else 0.0

        samples.append(click1 + thud1 + click2 + thud2)
    return samples

def generate_promote():
    # Ascending celebratory arpeggio: C5, E5, G5, C6 (~500ms)
    duration = 0.52
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    notes = [523.25, 659.25, 783.99, 1046.5]
    delays = [0.0, 0.065, 0.13, 0.195]
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        val = 0.0
        for freq, d in zip(notes, delays):
            if t >= d:
                local_t = t - d
                decay = math.exp(-local_t * 7.5)
                note = (math.sin(2 * math.pi * freq * local_t) +
                        0.3 * math.sin(2 * math.pi * freq * 2 * local_t)) * decay
                val += note * 0.28
        samples.append(val)
    return samples

def generate_game_start():
    # Upbeat welcoming chime: C5 -> G5 (~550ms)
    duration = 0.55
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        note1 = (math.sin(2 * math.pi * 523.25 * t) + 0.25 * math.sin(2 * math.pi * 1046.5 * t)) * math.exp(-t * 6.0) * 0.45
        t2 = max(0.0, t - 0.12)
        note2 = (math.sin(2 * math.pi * 783.99 * t2) + 0.25 * math.sin(2 * math.pi * 1567.98 * t2)) * math.exp(-t2 * 5.0) * 0.55 if t >= 0.12 else 0.0
        samples.append(note1 + note2)
    return samples

def generate_game_end():
    # Deep resolving chime/gong: E4 -> A3 (~950ms)
    duration = 0.95
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        tone1 = (math.sin(2 * math.pi * 329.63 * t) + 0.2 * math.sin(2 * math.pi * 659.25 * t)) * math.exp(-t * 4.0) * 0.4
        t2 = max(0.0, t - 0.14)
        tone2 = (math.sin(2 * math.pi * 220.00 * t2) + 0.25 * math.sin(2 * math.pi * 440.0 * t2)) * math.exp(-t2 * 3.0) * 0.55 if t >= 0.14 else 0.0
        samples.append(tone1 + tone2)
    return samples

def main():
    target_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'sounds')
    sounds = {
        'move.wav': generate_move,
        'capture.wav': generate_capture,
        'check.wav': generate_check,
        'checkmate.wav': generate_checkmate,
        'castle.wav': generate_castle,
        'promote.wav': generate_promote,
        'game-start.wav': generate_game_start,
        'game-end.wav': generate_game_end,
    }

    print(f"Generating 8 chess audio files into {target_dir}...")
    for fname, generator in sounds.items():
        out_path = os.path.join(target_dir, fname)
        samples = generator()
        create_wav(out_path, samples)
        print(f"  ✓ Created {fname} ({len(samples)} samples, {len(samples)/SAMPLE_RATE:.2f}s)")

if __name__ == '__main__':
    main()
