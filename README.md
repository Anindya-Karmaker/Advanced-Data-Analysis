# Advanced Data Analyzer

A powerful, browser-based tool for visualizing, analyzing, and performing statistical tests on generic graphical data, chromatography data, and custom CSV/Excel sheets. No installation required.


## 🧬 Overview

This tool was created for MALDI-TOF data, but has evolved into a fully-featured Advanced Data Analyzer. It provides researchers a fast, private, and flexible way to analyze datasets without being tied to proprietary software. It runs entirely in your web browser, meaning your experimental data never leaves your computer. It's designed to be intuitive for daily lab use while providing powerful features for in-depth statistical analysis, peak tracking, and generating publication-ready figures.

## 🚀 Key Features

-   **Smart Data Import:**
    -   **Custom Import Wizard:** Map columns from generic CSV or Excel (`.xlsx`, `.xls`) files.
-   **Session Management:** Save your entire analysis state—including data, annotations, integration bounds, and visual settings—into a single `.json` file to resume work later.
-   **Interactive Multi-Axis Plotting:**
    -   Visualize multiple variables on a single plot with synchronized axes.
    -   Full control over line color, thickness, style, markers, and labels.
-   **Advanced Statistical Analysis:**
    -   **Comprehensive Testing:** Perform built-in T-Tests, One-Way ANOVA, Two-Way ANOVA, and Tukey HSD post-hoc analysis natively.
    -   **Replicate Data Modes:** Combine multiple replicate traces automatically with dynamically generated standard deviation error bars.
-   **Rich Annotations & Significance Brackets:**
    -   **Drag Labels Mode:** Add, move, and edit fully customizable text labels dynamically.
    -   **Significance Brackets:** Use "auto-add from last test" to seamlessly link stats test results to bracket markers (*, **, ns) directly on the plot. Brackets can be dragged and individually styled.
-   **Publication-Ready Styling:**
    -   **Professional Axis Styling:** Enable and customize **Minor Ticks** for both X and Y axes.
    -   **Typography Control:** Customize font sizes and toggle **Bold** styles independently for Titles, Axes, Fractions, and Regions.
    -   **High-Res Export:** Save plots as PNGs at high resolution.
    -   **Fine-Grained Control:** Adjust legend positions, label rotation, and offsets via a dedicated settings panel.
-   **100% Client-Side:** Your data is processed locally in your browser. Nothing is ever uploaded to a server, ensuring complete data privacy.

## ⚙️ How to Use

No installation is needed!

1.  **Visit the Live Tool:** [https://github.com/Anindya-Karmaker/Advanced-Data-Analysis](https://github.com/Anindya-Karmaker/Advanced-Data-Analysis)
2.  **Or Download:** Download the `index.html` file from this repository and open it in any modern web browser (like Chrome, Firefox, or Safari).


## 🛠️ Built With

-   [Plotly.js](https://plotly.com/javascript/) - For interactive charting.
-   [PapaParse](https://www.papaparse.com/) - For robust in-browser CSV parsing.
-   [SheetJS (js-xlsx)](https://sheetjs.com/) - For reading Excel files.
-   [jstat](https://jstat.github.io/) - For robust statistical computing.
-   Plain HTML, CSS, and JavaScript - No frameworks, no servers, just a single file.

## 📄 License

Uses the MIT License so anyone can use it and modify it. 

## Citation

If you use **Advanced Data Analyzer** in your research, presentations, or publications, please cite it as follows:

**APA Format:**
> Karmaker, A., McCormick, A., Nandi, S., & McDonald, K. (2026). *Advanced Data Analyzer* [Software]. McDonald-Nandi Lab, University of California, Davis. https://github.com/Anindya-Karmaker/Advanced-Data-Analysis

**BibTeX:**
```bibtex
@software{AdvancedDataAnalyzer2026,
  author = {Karmaker, Anindya and McCormick, Alison and Nandi, Somen and McDonald, Karen},
  title = {Advanced Data Analyzer},
  year = {2026},
  url = {https://github.com/Anindya-Karmaker/Advanced-Data-Analysis},
  organization = {McDonald-Nandi Lab, University of California, Davis},
  version = {2.1}
}
```
