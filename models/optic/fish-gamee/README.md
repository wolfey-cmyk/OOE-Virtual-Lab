# 🎣 REFRACTION HUNTER: Snell's Law Python Game

A high-performance physics simulation and interactive game built with **Python** and **Pygame**. This project visualizes the optical illusion of refraction, where light bending at the water-to-air interface makes underwater objects appear shallower than their true physical location.

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Pygame](https://img.shields.io/badge/Pygame-000000?style=for-the-badge&logo=python&logoColor=green)

---

## 🚀 Features

- **Snell's Law Engine:** Real-time calculation of apparent vs. real depth ($n_{air}=1.0$, $n_{water}=1.33$).
- **Dynamic Marine Environment:** \* Procedural seaweed swaying and bubble physics.
  - Animated water waves and refraction rays.
  - Day/night atmospheric cycle with flickering stars and moon glow.
- **Visual Feedback:** Interactive ripples, particle-burst "hits," and refraction ray tracing.
- **Educational Overlays:** Toggleable "Real Positions" to see the hidden math behind the optical illusion.

## 🎮 How to Play

1.  **The Illusion:** Because light bends, the fish you see is just a "ghost" image.
2.  **The Strategy:** To hit a target, you must click **DEEPER** (lower) than the visual representation of the fish.
3.  **Controls:**
    - **Mouse Click:** Fire a shot at the target.
    - **[R] Key:** Toggle "Real Positions" to see the actual target vs. the refracted image.
    - **[H] Key:** Toggle the Help and Physics Constants HUD.
    - **[ESC]:** Quit the game.

## 🛠️ Tech Stack

- **Language:** Python 3.x
- **Library:** Pygame (for rendering and event handling)
- **Math:** Trigonometric functions for procedural animation and Snell's Law vectors.

## 📦 Getting Started

### Prerequisites

- Ensure you have [Python](https://www.python.org/) installed.
- Install the **Pygame** library:
  ```bash
  pip install pygame
  ```
