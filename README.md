# 🤖 Dobot Magician Lite - Autonomous Maze Solver

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.x-green.svg)](https://opencv.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Autonomous maze-solving robotic system using the Dobot Magician Lite integrated with computer vision and breadth-first search (BFS) pathfinding algorithm.

![Demo](https://img.youtube.com/vi/Lic5fkQXJk0/0.jpg)

**📹 [Watch Full Demo Video](https://youtu.be/Lic5fkQXJk0)**

---

## 🎯 Project Overview

This project demonstrates a complete **perception-planning-actuation** pipeline for autonomous maze navigation:

- **Perception:** Computer vision (OpenCV) for maze detection and marker recognition
- **Planning:** BFS pathfinding algorithm for optimal route computation
- **Actuation:** Dobot Magician Lite robotic arm for physical path execution

### Key Features

✅ **Camera-Robot Calibration:** 7-point affine transformation (2.34mm RMS error)  
✅ **Automatic Maze Detection:** Corner detection with perspective correction  
✅ **Grid Extraction:** Wall classification (95% accuracy)  
✅ **Color Detection:** HSV segmentation for start/end markers (100% success)  
✅ **BFS Pathfinding:** Optimal path in <20ms for 10×10 mazes  
✅ **Coordinate Transformation:** Multi-frame mapping (pixel → robot workspace)  
✅ **Robot Execution:** Precise motion with sub-3mm accuracy  

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| **Success Rate** | 95% (19/20 runs) |
| **Calibration Accuracy** | 2.34mm RMS error |
| **Processing Time** | ~3 seconds |
| **Wall Classification** | 95% accuracy |
| **Marker Detection** | 100% success |
| **Pathfinding Speed** | <20ms (10×10 maze) |
| **Robot Positioning** | <2mm deviation |

---

## 🛠️ System Architecture

```
┌─────────────────┐
│  Overhead       │
│  Camera         │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Vision  │
    │ Process │
    └────┬────┘
         │
    ┌────▼────┐
    │   BFS   │
    │ Pathfind│
    └────┬────┘
         │
    ┌────▼────┐
    │ Dobot   │
    │ Control │
    └─────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
Python 3.8+
OpenCV 4.x
NumPy
Pillow
pydobot
```

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/dobot-maze-solver.git
cd dobot-maze-solver

# Install dependencies
pip install -r requirements.txt

# Connect Dobot to COM5 (or update port in code)
```

### Usage

```bash
# Run the complete maze-solving pipeline
python maze_solver.py
```

**Steps:**
1. Camera captures maze image
2. Corner detection & perspective correction
3. Grid extraction & wall classification
4. BFS computes optimal path
5. Robot executes path autonomously

---

## 📁 Project Structure

```
dobot-maze-solver/
├── maze_solver.py              # Main execution script
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── part_2_maze_solution/       # Output directory
│   ├── camera_capture.png      # Raw camera image
│   ├── maze_corners_overlay.png # Corner detection
│   ├── maze_warp.png           # Perspective-corrected maze
│   ├── grid_overlay_annot.png  # Grid with wall labels
│   ├── solution_overlay.png    # Path solution
│   └── result.json             # Maze data + path
└── docs/                       # Documentation
    └── IEEE_Report.pdf         # Technical report
```

---

## 🧠 Algorithm Details

### 1. Camera Calibration
- **Method:** 7-point affine transformation
- **Algorithm:** RANSAC (1.0px threshold, 1000 iterations)
- **Accuracy:** 2.34mm RMS error

### 2. Vision Processing
- **Corner Detection:** Otsu thresholding + morphological ops
- **Perspective Transform:** 1200×1200px orthogonal view
- **Grid Extraction:** 30px cells with 5% wall threshold
- **Color Detection:** HSV segmentation
  - Red: H∈[0°,15°]∪[165°,180°]
  - Green: H∈[30°,90°]

### 3. BFS Pathfinding
```python
def bfs_path(grid, start, end):
    queue = deque([start])
    visited = {start}
    parent = {}
    
    while queue:
        current = queue.popleft()
        if current == end:
            return reconstruct_path(parent, start, end)
        
        for neighbor in get_neighbors(current):
            if neighbor not in visited and is_traversable(neighbor):
                visited.add(neighbor)
                parent[neighbor] = current
                queue.append(neighbor)
    
    return None
```

**Properties:**
- Time Complexity: O(V + E)
- Space Complexity: O(V)
- Guarantees: Shortest path in unweighted grid

### 4. Coordinate Transformations
1. **Grid → Warped Image:** Cell indices to pixel coordinates
2. **Warped → Original:** Inverse perspective transform
3. **Original → Robot:** Affine transformation matrix

---

## 🎥 Demo Video

**Full demonstration:** https://youtu.be/Lic5fkQXJk0

Shows complete system operation from image capture to robot execution.

---

## 📖 Technical Report

Detailed IEEE-format technical report available in `/docs/IEEE_Report.pdf`

**Topics covered:**
- System architecture
- Calibration methodology
- Vision processing pipeline
- BFS algorithm analysis
- Performance evaluation
- Error analysis

---

## 🔧 Hardware Requirements

- **Robot:** Dobot Magician Lite (4-DOF arm)
- **Camera:** USB webcam (640×480 minimum)
- **Computer:** Windows/Linux with Python 3.8+
- **Connection:** USB to Dobot (COM5)

---

## 📈 Results

### Maze Solving Performance

| Maze Size | Path Length | Computation Time | Execution Time |
|-----------|-------------|------------------|----------------|
| 3×3       | 4 steps     | <1 ms            | 8 s            |
| 5×5       | 8 steps     | ~3 ms            | 16 s           |
| 7×7       | 12 steps    | ~8 ms            | 24 s           |
| 10×10     | 18 steps    | ~15 ms           | 36 s           |

### Error Analysis

**Calibration Error:** ±2.34mm  
**Perspective Transform Error:** ±1.5mm  
**Robot Positioning Error:** ±1.5mm  
**Total Accumulated Error:** ~3-4mm (6-8% of 50mm cells)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add YourFeature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Harish Anand**  
Arizona State University  
RAS 545 - Robotics and Automation Systems  
Instructor: Prof. Sangram Redkar

---

## 🙏 Acknowledgments

- **Course:** RAS 545 - Robotics and Automation Systems, ASU
- **Instructor:** Prof. Sangram Redkar
- **Libraries:** OpenCV, NumPy, pydobot
- **Hardware:** Dobot Robotics

---

## 📚 References

1. Russell & Norvig - *Artificial Intelligence: A Modern Approach*
2. Bradski & Kaehler - *Learning OpenCV*
3. Cormen et al. - *Introduction to Algorithms*
4. [OpenCV Documentation](https://docs.opencv.org/)
5. [Dobot Magician Lite Manual](https://www.dobot.cc/)

---

## 📧 Contact

For questions or collaboration:
- **GitHub:** [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- **Email:** your.email@asu.edu

---

**⭐ Star this repo if you found it helpful!**
