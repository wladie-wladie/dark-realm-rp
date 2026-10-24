# Музыка «Тёмных земель»: партитуры в коде → MIDI → FluidSynth (FluidR3 GM) → бесшовная петля OGG.
import mido, random, subprocess, os, sys, math

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def P(n):  # "C#4" → 61
    name = n[0]; acc = 0; i = 1
    while i < len(n) and n[i] in "#b": acc += 1 if n[i] == "#" else -1; i += 1
    return 12 * (int(n[i:]) + 1) + NOTE[name] + acc

QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10], "sus": [0, 5, 7], "5": [0, 7]}
def chord(sym, octave=3):
    root = sym[0] + (sym[1] if len(sym) > 1 and sym[1] in "#b" else "")
    q = sym[len(root):]
    r = P(root + str(octave))
    return [r + i for i in QUAL[q]]

class Song:
    def __init__(self, name, bpm, beats=4):
        self.name, self.bpm, self.beats = name, bpm, beats
        self.parts = {}  # имя → [программа, канал, громкость, [(начало, длит, нота, сила)]]
        self.ch = 0
    def part(self, name, program, vol=100, drums=False, pan=64, reverb=60):
        if name not in self.parts:
            ch = 9 if drums else self.ch
            if not drums:
                self.ch += 1
                if self.ch == 9: self.ch = 10
            self.parts[name] = [program, ch, vol, [], pan, reverb]
        return self.parts[name][3]
    def add(self, name, t, d, n, v=80):
        self.parts[name][3].append((t, d, n, v))

    def melody(self, name, start, text, octave_shift=0, vel=88, legato=0.95):
        # «D5 2, F5 1, r 1 | ...» — ноты с длительностями в долях
        t = start
        for tok in text.replace("|", ",").split(","):
            tok = tok.strip()
            if not tok: continue
            n, d = tok.split(); d = float(d)
            if n != "r":
                self.add(name, t, d * legato, P(n) + 12 * octave_shift, vel + random.randint(-6, 6))
            t += d
        return t

def render(song, bars, out, seed=1):
    random.seed(seed)
    mid = mido.MidiFile(ticks_per_beat=480)
    tempo = mido.bpm2tempo(song.bpm)
    L = bars * song.beats
    for name, (prog, ch, vol, notes, pan, rev) in song.parts.items():
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage("set_tempo", tempo=tempo, time=0))
        if ch != 9: tr.append(mido.Message("program_change", program=prog, channel=ch, time=0))
        tr.append(mido.Message("control_change", control=7, value=vol, channel=ch, time=0))
        tr.append(mido.Message("control_change", control=10, value=pan, channel=ch, time=0))
        tr.append(mido.Message("control_change", control=91, value=rev, channel=ch, time=0))
        ev = []
        # петля проигрывается дважды: берём вторую копию, в ней уже есть «хвост» реверберации первой
        for rep in range(2):
            for (t, d, n, v) in notes:
                hum = 0 if ch == 9 else random.uniform(-0.012, 0.012)
                s = max(0, t + rep * L + hum); e = s + max(0.05, d)
                ev.append((s, 1, mido.Message("note_on", note=int(n), velocity=max(1, min(127, int(v))), channel=ch)))
                ev.append((e, 0, mido.Message("note_off", note=int(n), velocity=0, channel=ch)))
        ev.sort(key=lambda x: (x[0], x[1]))
        last = 0
        for s, _, m in ev:
            tick = int(round(s * 480)); m.time = tick - last; last = tick; tr.append(m)
    os.makedirs("build_music", exist_ok=True)
    mp = f"build_music/{out}.mid"; wav = f"build_music/{out}.wav"
    mid.save(mp)
    subprocess.run(["fluidsynth", "-ni", "-g", "0.7", "-r", "44100", "-F", wav, "/usr/share/sounds/sf2/FluidR3_GM.sf2", mp], check=True, capture_output=True)
    sec = L * 60 / song.bpm
    dst = f"../../assets/music/{out}.ogg"
    os.makedirs("../../assets/music", exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{sec:.4f}", "-t", f"{sec:.4f}", "-i", wav,
                    "-af", f"loudnorm=I=-17:TP=-1.5:LRA=11,afade=t=in:d=0.004,afade=t=out:st={sec-0.004:.4f}:d=0.004", "-ar", "44100", "-c:a", "libvorbis", "-q:a", "4", dst], check=True)
    print(out, f"{sec:.1f} с")

# ---------- общие узоры ----------
def pad(s, part, chords, bar_beats, start=0, octave=3, vel=58, top=True):
    for i, c in enumerate(chords):
        notes = chord(c, octave) + ([chord(c, octave)[0] + 12] if top else [])
        for n in notes: s.add(part, start + i * bar_beats, bar_beats * 0.98, n, vel)

def bassline(s, part, chords, bar_beats, start=0, octave=2, pattern=((0, 2), (2, 2)), vel=78):
    for i, c in enumerate(chords):
        r = chord(c, octave)[0]
        for (o, d) in pattern: s.add(part, start + i * bar_beats + o, d * 0.95, r, vel)

def arp(s, part, chords, bar_beats, start=0, octave=3, step=0.5, order=(0, 1, 2, 3, 2, 1), vel=62):
    for i, c in enumerate(chords):
        tones = chord(c, octave); tones = tones + [tones[0] + 12, tones[1] + 12, tones[2] + 12]
        n = int(bar_beats / step)
        for k in range(n): s.add(part, start + i * bar_beats + k * step, step * 1.6, tones[order[k % len(order)]], vel + (8 if k == 0 else 0))

# ---------- заставка ----------
def title():
    s = Song("title", 72); B = 4
    A = ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "A"]
    Bs = ["Bb", "F", "Gm", "Dm", "Bb", "F", "A", "A"]
    A2 = ["Dm", "Bb", "F", "C", "Gm", "Bb", "A", "Dm"]
    ch = A + Bs + A2
    s.part("str", 49, 92); s.part("harp", 46, 96, pan=44); s.part("cello", 42, 90, pan=80)
    s.part("flute", 73, 100, pan=70); s.part("horn", 60, 92, pan=56); s.part("choir", 52, 70); s.part("timp", 47, 90)
    pad(s, "str", ch, B, vel=52)
    arp(s, "harp", ch, B, octave=4, step=0.5, order=(0, 1, 2, 3, 4, 3, 2, 1), vel=56)
    bassline(s, "cello", ch, B, pattern=((0, 2), (2, 2)), vel=70)
    s.melody("flute", 0, "A4 2, D5 1, E5 1 | F5 3, E5 1 | D5 2, C5 1, A4 1 | C5 2, G4 2 | A4 2, D5 1, F5 1 | G5 2, F5 1, D5 1 | Bb4 1, D5 1, G5 2 | E5 2, C#5 2")
    s.melody("horn", 32, "D4 2, F4 2 | C4 2, A3 2 | Bb3 2, D4 1, G4 1 | F4 3, E4 1 | D4 2, F4 1, G4 1 | A4 2, G4 1, F4 1 | E4 4 | C#4 2, E4 2", vel=80)
    pad(s, "choir", Bs, B, start=32, octave=4, vel=46, top=False)
    s.melody("flute", 64, "A4 2, D5 1, E5 1 | F5 3, E5 1 | D5 2, C5 1, A4 1 | C5 2, G4 2", vel=80)
    s.melody("horn", 64, "A3 2, D4 1, E4 1 | F4 3, E4 1 | D4 2, C4 1, A3 1 | C4 2, G3 2 | G3 2, Bb3 2 | D4 2, F4 1, D4 1 | E4 2, C#4 2 | D4 4", vel=84)
    for b in (0, 32, 64, 92): s.add("timp", b, 1, P("D2"), 90)
    render(s, 24, "title")

# ---------- город (вальс-джига) ----------
def town():
    s = Song("town", 112, 3); B = 3
    A = ["G", "D", "Em", "C", "G", "D", "C", "D"]
    Bs = ["Em", "C", "G", "D", "Em", "C", "D", "D"]
    C = ["G", "C", "G", "D", "G", "C", "D", "G"]
    ch = A + A + Bs + Bs + A + C
    s.part("guitar", 24, 100, pan=48); s.part("pizz", 45, 92, pan=76); s.part("rec", 74, 104, pan=70)
    s.part("fiddle", 110, 86, pan=40); s.part("drum", 0, 80, drums=True); s.part("pad", 49, 60)
    for i, c in enumerate(ch):
        t = i * B; tones = chord(c, 3)
        s.add("guitar", t, 0.9, tones[0] - 12 if tones[0] > 52 else tones[0], 76)
        for k in (1, 2):
            for n in tones[1:] + [tones[0] + 12]: s.add("guitar", t + k, 0.8, n, 58)
        s.add("pizz", t, 0.8, chord(c, 2)[0], 82)
        s.add("drum", t, 0.3, 35, 64); s.add("drum", t + 1, 0.2, 54, 40); s.add("drum", t + 2, 0.2, 54, 46)
        if i % 4 == 3: s.add("drum", t + 2.5, 0.2, 54, 36)
    pad(s, "pad", ch, B, vel=34, top=False)
    melA = "D5 1, G5 1, A5 1 | B5 1.5, A5 0.5, F#5 1 | G5 1, E5 1, B4 1 | C5 1, E5 1, G5 1 | B4 1, D5 1, G5 1 | F#5 1, A5 1, D5 1 | E5 1, G5 1, E5 0.5, C5 0.5 | D5 3"
    melA2 = "D5 1, G5 1, A5 1 | B5 1.5, A5 0.5, F#5 1 | G5 1, E5 1, B4 1 | C5 1, E5 1, G5 1 | B4 1, D5 1, G5 1 | A5 1, B5 1, A5 1 | G5 1, E5 1, C5 1 | D5 1, F#5 1, A5 1"
    melB = "E5 1, F#5 1, G5 1 | E5 2, C5 1 | D5 1, G5 1, B5 1 | A5 3 | B5 1, A5 1, G5 1 | G5 1, E5 1, C5 1 | D5 1, E5 1, F#5 1 | A5 2, r 1"
    t = s.melody("rec", 0, melA); t = s.melody("rec", t, melA2)
    s.melody("fiddle", t, melB, vel=84); t = s.melody("fiddle", t + 24, melB, vel=86)
    s.melody("rec", t - 24, melB.replace("5", "6").replace("B6", "B5").replace("A6", "A5"), octave_shift=0, vel=70)
    t = s.melody("rec", t, melA)
    s.melody("rec", t, "G5 3 | E5 3 | D5 3 | F#5 3 | G5 3 | E5 3 | F#5 3 | G5 3", vel=66)
    render(s, len(ch), "town")

# ---------- лес ----------
def forest():
    s = Song("forest", 84); B = 4
    A = ["Am", "F", "C", "G", "Am", "F", "Dm", "E"]
    Bs = ["F", "G", "Em", "Am", "F", "G", "E", "E"]
    ch = A + A + Bs + A
    s.part("harp", 46, 100, pan=50); s.part("pizz", 45, 80, pan=80); s.part("pad", 49, 72); s.part("pan", 75, 100, pan=70); s.part("oboe", 68, 90, pan=40)
    arp(s, "harp", ch, B, octave=3, step=0.5, order=(0, 2, 3, 4, 5, 4, 3, 2), vel=58)
    for i, c in enumerate(ch):
        for k in (0, 2): s.add("pizz", i * B + k, 0.5, chord(c, 2)[0] + (0 if k == 0 else 7), 70)
    pad(s, "pad", ch, B, vel=40, top=False)
    melA = "E5 2, A5 1, G5 1 | F5 3, E5 1 | E5 1, D5 1, C5 2 | D5 4 | E5 2, A5 1, B5 1 | C6 2, B5 1, A5 1 | F5 2, A5 2 | G#5 4"
    s.melody("pan", 0, melA)
    s.melody("pan", 48, "A5 2, E5 2 | F5 2, A5 2 | D5 2, F5 1, E5 1 | E5 4", vel=80)
    s.melody("oboe", 64, "A4 2, C5 2 | B4 2, D5 2 | G5 2, E5 2 | C5 4 | A5 2, G5 1, F5 1 | G5 2, F5 1, D5 1 | E5 2, G#4 2 | B4 4")
    s.melody("pan", 96, melA, vel=84)
    render(s, len(ch), "forest")

# ---------- болото, ночь ----------
def swamp():
    s = Song("swamp", 60); B = 4
    ch = ["Em", "Em", "F", "F", "Em", "Em", "Dm", "Dm", "C", "C", "B", "B"] * 2
    s.part("bass", 43, 92); s.part("trem", 44, 70, pan=50); s.part("choir", 91, 70, pan=70); s.part("cel", 8, 84, pan=90, reverb=110); s.part("timp", 47, 80)
    for i, c in enumerate(ch): s.add("bass", i * B, B * 0.99, chord(c, 1)[0] + 12, 66)
    pad(s, "trem", ch, B, octave=3, vel=40, top=False)
    for i in range(0, len(ch), 2): 
        for n in chord(ch[i], 4)[:2]: s.add("choir", i * B, 2 * B * 0.98, n, 44)
    rnd = random.Random(7); scale = [P(x) for x in ["E5", "F5", "G5", "B5", "C6", "E6", "G5", "B4"]]
    t = 2.0
    while t < len(ch) * B - 2:
        s.add("cel", t, 1.5, rnd.choice(scale), rnd.randint(40, 70)); t += rnd.choice([1.5, 2, 2.5, 3, 4])
    for b in (32, 80):
        for k in range(16): s.add("timp", b + k * 0.25, 0.25, P("E2"), 30 + k * 4)
    render(s, len(ch), "swamp")

# ---------- старый тракт ----------
def tract():
    s = Song("tract", 96); B = 4
    A = ["Dm", "C", "Bb", "C", "Dm", "C", "Bb", "A"]
    Bs = ["Gm", "Dm", "Bb", "F", "Gm", "Dm", "Bb", "A"]
    ch = A + A + Bs + A
    s.part("cello", 42, 96, pan=70); s.part("drum", 0, 90, drums=True); s.part("fiddle", 110, 92, pan=44); s.part("horn", 60, 90, pan=60); s.part("str", 48, 70)
    for i, c in enumerate(ch):
        r = chord(c, 2)[0]
        for k, o in enumerate([0, 0, 7, 0, 3 if "m" in c else 4, 0, 7, 12]): s.add("cello", i * B + k * 0.5, 0.45, r + o, 72 + (10 if k == 0 else 0))
        t = i * B
        s.add("drum", t, 0.3, 36, 84); s.add("drum", t + 1.5, 0.3, 36, 60); s.add("drum", t + 2, 0.3, 45, 74); s.add("drum", t + 3, 0.3, 45, 56)
        if i % 4 == 3: [s.add("drum", t + 3 + q * 0.25, 0.2, 47 if q % 2 else 45, 60 + q * 6) for q in range(4)]
    pad(s, "str", ch, B, vel=42, top=False)
    melA = "D5 1, E5 1, F5 1, A5 1 | G5 2, E5 2 | F5 1, E5 1, D5 1, F5 1 | E5 3, C5 1 | D5 1, F5 1, A5 1, D6 1 | C6 2, G5 2 | A5 1, G5 1, F5 1, D5 1 | E5 2, C#5 2"
    s.melody("fiddle", 0, melA); s.melody("fiddle", 32, melA, vel=84)
    s.melody("horn", 64, "G4 3, Bb4 1 | A4 4 | Bb4 2, D5 2 | C5 4 | D5 2, G5 2 | F5 2, A4 2 | G4 2, E4 2 | A4 4")
    s.melody("fiddle", 96, melA, vel=90); pad(s, "horn", A, B, start=96, octave=3, vel=46, top=False)
    render(s, len(ch), "tract")

# ---------- шахта ----------
def mine():
    s = Song("mine", 70); B = 4
    ch = (["Cm", "Cm", "Ab", "Ab", "Fm", "Fm", "G", "G"]) * 3
    s.part("bass", 43, 92); s.part("low", 49, 76); s.part("dul", 15, 90, pan=40, reverb=100); s.part("glock", 9, 70, pan=90, reverb=110); s.part("brass", 61, 70); s.part("drum", 0, 80, drums=True)
    for i, c in enumerate(ch): s.add("bass", i * B, B * 0.99, chord(c, 1)[0] + 12, 70)
    pad(s, "low", ch, B, octave=3, vel=40, top=False)
    rnd = random.Random(3); drip = [P(x) for x in ["G5", "Eb5", "C5", "D5", "G4", "Bb4", "C6"]]
    motif = "G5 1, Eb5 1, C5 2 | r 4 | G5 1, Ab5 1, G5 1, Eb5 1 | D5 4"
    for st in (0, 32, 64): s.melody("dul", st + 8, motif, vel=70)
    t = 1
    while t < len(ch) * B: s.add("glock", t, 0.5, rnd.choice(drip) + 12, rnd.randint(30, 55)); t += rnd.choice([2.5, 3, 4.5, 6])
    pad(s, "brass", ch[16:], B, start=64, octave=3, vel=48, top=False)
    t = 0
    while t < len(ch) * B:
        s.add("drum", t, 0.2, 76, rnd.randint(30, 50)); t += rnd.choice([3, 5, 6.5, 8])
    render(s, len(ch), "mine")

# ---------- бой с боссом ----------
def boss():
    s = Song("boss", 150); B = 4
    A = ["Em", "C", "D", "B", "Em", "C", "Am", "B"]
    Bs = ["C", "D", "Em", "Em", "C", "D", "B", "B"]
    ch = A + Bs + A + Bs
    s.part("ost", 48, 92, pan=50); s.part("drum", 0, 100, drums=True); s.part("brass", 61, 84, pan=70); s.part("horn", 60, 100, pan=56); s.part("choir", 52, 76); s.part("timp", 47, 96); s.part("cb", 43, 90)
    for i, c in enumerate(ch):
        r = chord(c, 3)[0]; t = i * B
        for k, o in enumerate([0, 0, 3 if "m" in c else 4, 0, 7, 0, 3 if "m" in c else 4, 0] * 2): s.add("ost", t + k * 0.25, 0.22, r + o, 66 + (12 if k % 4 == 0 else 0))
        s.add("cb", t, 2, chord(c, 1)[0] + 12, 80); s.add("cb", t + 2, 2, chord(c, 1)[0] + 12, 74)
        for b in (0, 1.5, 2, 3.5): s.add("drum", t + b, 0.2, 36, 92)
        for b in (1, 3): s.add("drum", t + b, 0.2, 38, 86)
        for b in range(8): s.add("drum", t + b * 0.5, 0.1, 42, 46)
        if i % 8 == 0: s.add("drum", t, 1, 49, 100)
        if i % 4 == 3: [s.add("drum", t + 2 + q * 0.25, 0.2, [50, 48, 47, 45][q % 4], 80 + q * 3) for q in range(8)]
        for n in chord(c, 3): s.add("brass", t, 0.6, n, 84)
        s.add("timp", t, 0.8, chord(c, 2)[0], 96)
    hornA = "E4 2, G4 1, B4 1 | C5 3, B4 1 | A4 2, F#4 2 | B4 4 | E5 2, D5 1, B4 1 | C5 2, E5 2 | A4 2, C5 2 | D#5 4"
    hornB = "E5 2, G5 2 | F#5 2, A5 2 | G5 3, F#5 1 | E5 4 | E5 2, C5 2 | D5 2, A4 2 | B4 2, D#5 2 | F#5 4"
    s.melody("horn", 0, hornA); s.melody("horn", 32, hornB); s.melody("horn", 64, hornA, octave_shift=1, vel=84); s.melody("horn", 96, hornB)
    pad(s, "choir", Bs, B, start=32, octave=4, vel=56, top=False); pad(s, "choir", Bs, B, start=96, octave=4, vel=60, top=False)
    render(s, len(ch), "boss")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    todo = sys.argv[1:] or ["title", "town", "forest", "swamp", "tract", "mine", "boss"]
    for name in todo: globals()[name]()
