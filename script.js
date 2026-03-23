// --- Global Variables/Functions for HTML access ---
window.openCustomImportModal = null;
window.closeCustomImportModal = null;
window.previewCustomFile = null;
window.importFullFile = null;
window.applyStyleSettings = null;
window.updateActiveSmoothing = null;
window.updatePeakAnalysis = null;
window.saveSession = null;
window.loadSession = null;
window.copyPlotToClipboard = null;
window.switchTab = null;
window.switchImgTab = null;
window.openImageModal = null;
window.closeImageModal = null;
window.loadSpectrumImage = null;
window.startColorPick = null;
window.startCalPick = null;
window.onManualColorPick = null;
window.onImgBgMethodChange = null;
window.updateBoundsFromInputs = null;
window.autoDetectBounds = null;
window.extractAndPreview = null;
window.importImageData = null;
window.updateBgCorrection = null;
window.applyAxisShift = null;
window.resetAxisShift = null;
window.openDataTable = null;
window.dataTableAddRow = null;
window.dataTableExportCSV = null;
window.runDescriptiveStats = null;
window.runStatTest = null;
window.runColumnSummary = null;
window.applyPlotAppearance = null;
window.exportActiveCSV = null;
window.exportSVG = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        files: [],
        activeFileId: null,
        // plotConfig schema: { xCol, yCol, y2Col (opt), color, traceName, mode, lineDash, lineWidth, smoothing, smoothingMethod, sgOrder, yaxisSide, peakConfig: { show, highlight, prominence } }
        plotConfig: {},
        trendlines: {},
        pendingFile: null,
        pendingPreviewData: null,
        pendingWorkbook: null,  // cached parsed workbook for sheet switching
        pendingSheetName: null,
        annotations: [], // Custom peak labels for publication
        labelMode: false,  // Toggle for adding labels
        xaxisRange: { start: null, end: null }, // Global X-axis range
        showLabels: true   // Global label visibility
        // bgCorrection/axisShift stored per-file in plotConfig
    };

    // --- DOM Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileListEl = document.getElementById('file-list');
    const configPanel = document.getElementById('config-panel');
    const activeFileNameEl = document.getElementById('active-file-name');
    const xAxisSelect = document.getElementById('x-axis-select');
    const yAxisSelect = document.getElementById('y-axis-select');
    const trendlineSelect = document.getElementById('trendline-type');
    const updatePlotBtn = document.getElementById('update-plot-btn');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const trendlineStats = document.getElementById('trendline-stats');
    const statusBar = document.getElementById('statusBar');
    const viewTableBtn = document.getElementById('view-table-btn');
    const tableContainer = document.getElementById('table-container');
    const dataTable = document.getElementById('data-table');
    const plotlyDiv = document.getElementById('plotly-div');

    // Smoothing Controls
    const smoothingMethod = document.getElementById('smoothing-method');
    const smoothingSlider = document.getElementById('smoothing-slider');
    const smoothingValue = document.getElementById('smoothing-value');
    const sgPolyOptions = document.getElementById('sg-poly-options');
    const sgPolyOrder = document.getElementById('sg-poly-order');

    // Peak Analysis Controls
    const showPeaksCheck = document.getElementById('show-peaks-check');
    const highlightPeaksCheck = document.getElementById('highlight-peaks-check');
    const peakProminenceSlider = document.getElementById('peakProminenceSlider'); // Legacy support if needed, but we use peakHeight
    const peakHeightSlider = document.getElementById('peakHeightSlider');
    const peakProminenceVal = document.getElementById('peak-prominence-val'); // Legacy
    const peakHeightVal = document.getElementById('peak-height-val');
    const peakStatsBox = document.getElementById('peak-stats-box');
    const peakCountEl = document.getElementById('peak-count');
    const peakMaxYEl = document.getElementById('peak-max-y');
    const peakMaxXEl = document.getElementById('peak-max-x');

    // Axis & Y2 Controls
    const xAxisLabelInput = document.getElementById('xAxisLabel');
    const yAxisLabelInput = document.getElementById('yAxisLabel');
    const y2AxisLabelInput = document.getElementById('y2AxisLabel');
    const enableY2Check = document.getElementById('enableY2Check');
    const y2SettingsDiv = document.getElementById('y2-settings');

    // Import Modal Elements
    const customImportModal = document.getElementById('customImportModal');
    const customFileInput = document.getElementById('customFileInput');
    const previewDelimiter = document.getElementById('previewDelimiter');
    const headerRowIndex = document.getElementById('headerRowIndex');
    const previewTable = document.getElementById('previewTable');
    const previewSection = document.getElementById('preview-section');
    const mapXSelect = document.getElementById('mapXSelect');
    const mapYSelect = document.getElementById('mapYSelect');
    const mapY2Select = document.getElementById('mapY2Select');
    const mapXLabel = document.getElementById('mapXLabel');
    const mapYLabel = document.getElementById('mapYLabel');
    const importBtn = document.getElementById('importBtn');

    // Embedded Style Controls
    const styleTraceName = document.getElementById('styleTraceName');
    const styleColor = document.getElementById('styleColor');
    const styleMode = document.getElementById('styleMode');
    const styleLineDash = document.getElementById('styleLineDash');
    const styleLineWidth = document.getElementById('styleLineWidth');
    const styleYAxisSide = document.getElementById('styleYAxisSide');
    const showTraceCheck = document.getElementById('showTraceCheck');
    const xAxisStart = document.getElementById('xAxisStart');
    const xAxisEnd = document.getElementById('xAxisEnd');
    const showLabelsCheck = document.getElementById('showLabelsCheck');


    // ── Robust numeric parser: handles "20%", "$1,234.5", "1.2e3", etc. ──
    function parseVal(v) {
        if (v === null || v === undefined || v === '') return NaN;
        if (typeof v === 'number') return v;
        // Strip currency, percent, thousands-separators, leading/trailing spaces
        const s = String(v).trim()
            .replace(/[$€£¥₹]/g, '')
            .replace(/,/g, '')
            .replace(/%\s*$/, '');   // strip trailing %
        const n = parseFloat(s);
        if (isNaN(n)) return NaN;
        // If original value ended with %, divide by 100 so 20% → 0.2
        // BUT: for graphing raw bar heights "20%" should stay as 20, not 0.2
        // We just return the bare number and let axis formatting handle display.
        // Users who want 0–1 scale can use axis shift.
        return n;
    }

    // Detect if a column is all-percent strings (for axis tick formatting)
    function isPercentCol(file, colName) {
        return file.data.every(r => {
            const v = String(r[colName]||'').trim();
            return v === '' || v.endsWith('%');
        });
    }

    // --- Colors ---
    const colors = ['#00796b', '#d32f2f', '#1976d2', '#fbc02d', '#7b1fa2', '#e64a19', '#455a64', '#0097a7'];


    // --- Global Assignments ---
    window.openCustomImportModal = () => { if (customImportModal) { customImportModal.style.display = 'block'; resetModal(); } };
    window.closeCustomImportModal = () => { if (customImportModal) customImportModal.style.display = 'none'; state.pendingFile = null; };
    window.previewCustomFile = handlePreview;
    window.importFullFile = handleImportFull;

    window.applyStyleSettings = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        const styleTraceName2  = document.getElementById('styleTraceName');
        const styleColor2      = document.getElementById('styleColor');
        const styleLineWidth2  = document.getElementById('styleLineWidth');
        const styleLineDash2   = document.getElementById('styleLineDash');
        const styleYAxisSide2  = document.getElementById('styleYAxisSide');
        const chartTypeSelect2 = document.getElementById('chartTypeSelect');
        const styleOpacity2    = document.getElementById('styleOpacity');
        const ebCheck = document.getElementById('errorBarsCheck');
        const etSel   = document.getElementById('errorTypeSelect');
        const ecSel   = document.getElementById('errorColSelect');
        const ecP     = document.getElementById('errorColPlusSelect');
        const ecM     = document.getElementById('errorColMinusSelect');
        const ecConst = document.getElementById('errorConstant');
        const ecPct   = document.getElementById('errorPercent');

        if (styleTraceName2) config.traceName = styleTraceName2.value;
        if (styleColor2)     config.color     = styleColor2.value;
        if (styleLineWidth2) config.lineWidth  = parseInt(styleLineWidth2.value)||2;
        if (styleLineDash2)  config.lineDash   = styleLineDash2.value;
        if (styleYAxisSide2) config.yaxisSide  = styleYAxisSide2.value;
        if (chartTypeSelect2){ config.chartType = chartTypeSelect2.value; config.mode = config.chartType; }
        if (styleOpacity2)   config.opacity    = parseInt(styleOpacity2.value)/100 || 1;

        if (!config.errorConfig) config.errorConfig = {};
        if (ebCheck)  config.errorConfig.show    = ebCheck.checked;
        if (etSel)    config.errorConfig.type    = etSel.value;
        if (ecSel)    config.errorConfig.col     = ecSel.value||null;
        if (ecP)      config.errorConfig.colPlus = ecP.value||null;
        if (ecM)      config.errorConfig.colMinus= ecM.value||null;
        if (ecConst)  config.errorConfig.constant= parseFloat(ecConst.value)||0;
        if (ecPct)    config.errorConfig.percent = parseFloat(ecPct.value)||5;

        renderFileList();
        renderPlot();
    };

    window.toggleAllLabels = () => {
        state.showLabels = showLabelsCheck.checked;
        renderPlot();
        updateStatus(state.showLabels ? 'Labels shown' : 'Labels hidden');
    };

    window.toggleTraceVisibility = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        config.visible = showTraceCheck.checked;
        renderPlot();
        updateStatus(config.visible ? 'Trace visible' : 'Trace hidden');
    };

    window.updateGlobalXRange = () => {
        const startVal = xAxisStart.value;
        const endVal = xAxisEnd.value;
        state.xaxisRange.start = startVal !== '' ? parseFloat(startVal) : null;
        state.xaxisRange.end = endVal !== '' ? parseFloat(endVal) : null;
        renderPlot();
        updateStatus("Global X-axis range updated.");
    };

    window.updateActiveSmoothing = () => {
        if (state.activeFileId) {
            const c = state.plotConfig[state.activeFileId];
            c.smoothing = parseInt(smoothingSlider.value);
            c.smoothingMethod = smoothingMethod.value;
            c.sgOrder = parseInt(sgPolyOrder.value);
            if (smoothingValue) smoothingValue.textContent = c.smoothing;
            if (sgPolyOptions) sgPolyOptions.style.display = c.smoothingMethod === 'savitzkyGolay' ? 'block' : 'none';
            renderPlot();
        }
    };

    window.updatePeakAnalysis = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];

        config.peakConfig.show = showPeaksCheck.checked;
        config.peakConfig.highlight = highlightPeaksCheck.checked;
        config.peakConfig.prominence = parseInt(peakHeightSlider.value); // Use correct slider

        if (peakHeightVal) peakHeightVal.textContent = config.peakConfig.prominence;
        if (peakStatsBox) peakStatsBox.style.display = config.peakConfig.show ? 'block' : 'none';

        renderPlot();
    };

    window.saveSession = () => {
        const sessionData = JSON.stringify(state);
        const blob = new Blob([sessionData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis_session_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updateStatus("Session saved.");
    };

    window.toggleLabelMode = () => {
        state.labelMode = !state.labelMode;
        const btn = document.getElementById('toggleLabelBtn');
        if (btn) {
            btn.textContent = state.labelMode ? '🏷️ Labeling ON' : '🏷️ Add Custom Labels';
            btn.style.background = state.labelMode ? '#d32f2f' : '#00796b';
        }
        updateStatus(state.labelMode ? 'Click on plot to add labels' : 'Label mode OFF');
        renderPlot(); // Re-render to attach/detach handlers
    };

    window.clearLabels = () => {
        if (confirm('Clear all custom labels?')) {
            state.annotations = [];
            renderPlot();
            updateStatus('Labels cleared');
        }
    };

    window.openLabelManager = () => {
        if (state.annotations.length === 0) {
            alert('No labels to manage');
            return;
        }

        let html = '<h3 style="margin-top:0;">Manage Labels</h3>';
        html += '<div style="max-height: 400px; overflow-y: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        html += '<tr style="background:#f5f5f5;"><th style="padding:6px; text-align:left;">Label</th><th style="padding:6px;">X</th><th style="padding:6px;">Y</th><th style="padding:6px;">Trace</th><th style="padding:6px;">Actions</th></tr>';

        state.annotations.forEach((ann) => {
            const associatedFile = state.files.find(f => f.id === ann.fileId);
            const fileName = associatedFile ? associatedFile.name : 'None';

            html += `<tr style="border-bottom: 1px solid #eee;">`;
            html += `<td style="padding: 6px;">${ann.customText || ann.text}</td>`;
            html += `<td style="padding: 6px; text-align:center;">${parseFloat(ann.x).toFixed(2)}</td>`;
            html += `<td style="padding: 6px; text-align:center;">${parseFloat(ann.y).toFixed(2)}</td>`;
            html += `<td style="padding: 6px; text-align:center;">`;
            html += `<select id="file-select-${ann.id}" style="font-size: 11px; padding: 2px;" onchange="reassignLabel(${ann.id}, this.value)">`;

            // Add options for all files
            state.files.forEach(file => {
                const selected = file.id === ann.fileId ? 'selected' : '';
                html += `<option value="${file.id}" ${selected}>${file.name.substring(0, 20)}</option>`;
            });

            html += `</select></td>`;
            html += `<td style="padding: 6px; text-align:center;">`;
            html += `<button onclick="editLabel(${ann.id})" style="margin-right: 4px; padding: 3px 6px; font-size: 10px;">Edit</button>`;
            html += `<button onclick="deleteLabel(${ann.id})" style="padding: 3px 6px; font-size: 10px; background: #dc3545; color: white; border:none; cursor:pointer;">Del</button>`;
            html += `</td></tr>`;
        });

        html += '</table></div>';

        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 700px; width: 90%;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'margin-top: 15px; padding: 8px 16px; width: 100%;';
        closeBtn.onclick = () => document.body.removeChild(container);
        container.appendChild(closeBtn);

        document.body.appendChild(container);
    };

    window.reassignLabel = (labelId, newFileId) => {
        const ann = state.annotations.find(a => a.id === labelId);
        if (ann) {
            ann.fileId = newFileId;
            renderPlot();
            updateStatus('Label reassigned to new trace');
        }
    };

    window.editLabel = (id) => {
        const ann = state.annotations.find(a => a.id === id);
        if (!ann) return;

        const newText = prompt('Edit label text:', ann.customText || ann.text);
        if (newText !== null) {
            const showX = confirm('Include X-axis value?');
            const showY = confirm('Include Y-axis value?');

            let displayText = newText;
            if (showX && showY) {
                displayText = `${newText}\nX: ${parseFloat(ann.x).toFixed(2)}\nY: ${parseFloat(ann.y).toFixed(2)}`;
            } else if (showX) {
                displayText = `${newText}\nX: ${parseFloat(ann.x).toFixed(2)}`;
            } else if (showY) {
                displayText = `${newText}\nY: ${parseFloat(ann.y).toFixed(2)}`;
            }

            ann.text = displayText;
            ann.customText = newText;
            ann.showX = showX;
            ann.showY = showY;

            renderPlot();
            updateStatus('Label updated');

            const container = document.querySelector('div[style*="z-index: 10000"]');
            if (container) document.body.removeChild(container);
            window.openLabelManager();
        }
    };

    window.deleteLabel = (id) => {
        if (confirm('Delete this label?')) {
            state.annotations = state.annotations.filter(a => a.id !== id);
            renderPlot();
            updateStatus('Label deleted');

            const container = document.querySelector('div[style*="z-index: 10000"]');
            if (container) document.body.removeChild(container);
            if (state.annotations.length > 0) {
                window.openLabelManager();
            }
        }
    };

    window.loadSession = (input) => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedState = JSON.parse(e.target.result);
                // Validate basic structure
                if (!loadedState.files || !loadedState.plotConfig) throw new Error("Invalid session file.");

                // Show file selection dialog
                showFileSelectionDialog(loadedState);
            } catch (err) {
                alert("Error loading session: " + err.message);
                updateStatus("Error loading session.");
            }
        };
        reader.readAsText(file);
        input.value = ''; // Reset input
    };

    function showFileSelectionDialog(loadedState) {
        let html = '<h3 style="margin-top:0;">Select Files to Load</h3>';
        html += '<p style="font-size: 12px; color: #666;">Choose which files to load from this session:</p>';
        html += '<div style="max-height: 300px; overflow-y: auto; margin: 15px 0;">';

        loadedState.files.forEach((file, idx) => {
            const labelCount = (loadedState.annotations || []).filter(a => a.fileId === file.id).length;
            html += `<div style="padding: 8px; border-bottom: 1px solid #eee;">`;
            html += `<label style="display: flex; align-items: center; cursor: pointer;">`;
            html += `<input type="checkbox" class="file-checkbox" value="${file.id}" checked style="margin-right: 8px;">`;
            html += `<span style="flex: 1; font-size: 13px;">${file.name}</span>`;
            html += `<span style="font-size: 11px; color: #999;">${labelCount} labels</span>`;
            html += `</label></div>`;
        });

        html += '</div>';
        html += '<div style="display: flex; gap: 8px; margin-top: 15px;">';
        html += '<button id="selectAllBtn" style="flex: 1; padding: 8px;">Select All</button>';
        html += '<button id="deselectAllBtn" style="flex: 1; padding: 8px;">Deselect All</button>';
        html += '</div>';

        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 500px; width: 90%;';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load Selected Files';
        loadBtn.style.cssText = 'width: 100%; padding: 10px; margin-top: 10px; background: #00796b; color: white; font-weight: bold;';
        loadBtn.onclick = () => {
            const checkboxes = container.querySelectorAll('.file-checkbox:checked');
            const selectedFileIds = Array.from(checkboxes).map(cb => cb.value);

            if (selectedFileIds.length === 0) {
                alert('Please select at least one file to load');
                return;
            }

            loadSelectedFiles(loadedState, selectedFileIds);
            document.body.removeChild(container);
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'width: 100%; padding: 8px; margin-top: 8px;';
        cancelBtn.onclick = () => document.body.removeChild(container);

        container.appendChild(loadBtn);
        container.appendChild(cancelBtn);

        // Add select/deselect all handlers
        container.querySelector('#selectAllBtn').onclick = () => {
            container.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = true);
        };
        container.querySelector('#deselectAllBtn').onclick = () => {
            container.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
        };

        document.body.appendChild(container);
    }

    function loadSelectedFiles(loadedState, selectedFileIds) {
        // Filter files
        state.files = loadedState.files.filter(f => selectedFileIds.includes(f.id));

        // Filter plot configs
        state.plotConfig = {};
        selectedFileIds.forEach(fileId => {
            if (loadedState.plotConfig[fileId]) {
                state.plotConfig[fileId] = {
                    ...loadedState.plotConfig[fileId],
                    peakConfig: loadedState.plotConfig[fileId].peakConfig || { show: false, highlight: false, prominence: 0 },
                    axisLabels: loadedState.plotConfig[fileId].axisLabels || {},
                    enableY2: loadedState.plotConfig[fileId].enableY2 || false
                };
            }
        });

        // Filter trendlines
        state.trendlines = {};
        selectedFileIds.forEach(fileId => {
            if (loadedState.trendlines && loadedState.trendlines[fileId]) {
                state.trendlines[fileId] = loadedState.trendlines[fileId];
            }
        });

        // Filter annotations (only load labels for selected files)
        state.annotations = (loadedState.annotations || []).filter(ann =>
            selectedFileIds.includes(ann.fileId) || !ann.fileId
        );

        // Set active file
        state.activeFileId = state.files.length > 0 ? state.files[0].id : null;

        // Sync Global X-Axis Range Inputs
        if (loadedState.xaxisRange) {
            state.xaxisRange = loadedState.xaxisRange;
            if (xAxisStart) xAxisStart.value = state.xaxisRange.start !== null ? state.xaxisRange.start : '';
            if (xAxisEnd) xAxisEnd.value = state.xaxisRange.end !== null ? state.xaxisRange.end : '';
        }

        // Sync Label Visibility
        if (loadedState.showLabels !== undefined) {
            state.showLabels = loadedState.showLabels;
            if (showLabelsCheck) showLabelsCheck.checked = state.showLabels;
        }

        renderFileList();
        if (state.activeFileId) setActiveFile(state.activeFileId);
        updateStatus(`Loaded ${state.files.length} file(s) with ${state.annotations.length} label(s)`);
    }

    window.copyPlotToClipboard = async () => {
        if (!plotlyDiv) return;
        updateStatus("Copying image...");
        try {
            const url = await Plotly.toImage(plotlyDiv, { format: 'png', width: 1200, height: 800 });
            const res = await fetch(url);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            updateStatus("Plot copied to clipboard.");
        } catch (err) {
            console.error(err);
            alert("Failed to copy: " + err.message);
            updateStatus("Copy failed.");
        }
    };


    // --- Event Listeners ---
    if (dropZone) {
        dropZone.addEventListener('click', () => window.openCustomImportModal());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                window.openCustomImportModal();
                customFileInput.files = e.dataTransfer.files;
            }
        });
    }

    // viewTableBtn uses onclick=openDataTable() directly in HTML — no listener needed
    if (xAxisSelect) xAxisSelect.addEventListener('change', updateActiveConfig);
    if (yAxisSelect) yAxisSelect.addEventListener('change', updateActiveConfig);
    if (trendlineSelect) trendlineSelect.addEventListener('change', updateActiveTrendline);
    if (updatePlotBtn) updatePlotBtn.addEventListener('click', renderPlot);
    if (removeFileBtn) removeFileBtn.addEventListener('click', removeActiveFile);
    if (smoothingSlider) {
        smoothingSlider.addEventListener('input', (e) => {
            smoothingValue.textContent = e.target.value;
            window.updateActiveSmoothing();
        });
    }

    // Peak Detection Listener
    if (peakHeightSlider) {
        peakHeightSlider.addEventListener('input', () => {
            if (peakHeightVal) peakHeightVal.textContent = peakHeightSlider.value;
            updateActivePeakConfig();
        });
    }

    // Axis Label Listeners
    if (xAxisLabelInput) xAxisLabelInput.addEventListener('input', updateActiveAxisLabels);
    if (yAxisLabelInput) yAxisLabelInput.addEventListener('input', updateActiveAxisLabels);
    if (y2AxisLabelInput) y2AxisLabelInput.addEventListener('input', updateActiveAxisLabels);
    const _y3LInput = document.getElementById('y3AxisLabel');
    if (_y3LInput) _y3LInput.addEventListener('input', updateActiveAxisLabels);

    if (enableY2Check) {
        enableY2Check.addEventListener('change', () => {
            if (y2SettingsDiv) y2SettingsDiv.style.display = enableY2Check.checked ? 'block' : 'none';
            updateActiveAxisLabels();
        });
    }
    window.addEventListener('resize', () => { if (plotlyDiv && plotlyDiv.data) Plotly.Plots.resize(plotlyDiv); });

    // --- Functions ---
    function updateStatus(msg) { if (statusBar) statusBar.textContent = msg; }
    function toggleTable() {
        if (typeof window.openDataTable === 'function') window.openDataTable();
    }

    // --- Import Logic ---
    function resetModal() {
        if (customFileInput) customFileInput.value = '';
        if (previewSection) previewSection.style.display = 'none';
        if (importBtn) importBtn.disabled = true;
        if (previewTable) previewTable.innerHTML = '';
        state.pendingFile = null;
        state.pendingWorkbook = null;
        state.pendingSheetName = null;
        const sheetBar = document.getElementById('sheetSelectorBar');
        if (sheetBar) sheetBar.style.display = 'none';
    }

    function handlePreview() {
        const file = customFileInput.files[0];
        if (!file) { alert("Please select a file first."); return; }
        state.pendingFile = file;
        const delim = previewDelimiter.value;
        const headerRow = parseInt(headerRowIndex.value) || 1;
        updateStatus(`Generating preview...`);
        const extension = file.name.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(extension)) previewExcel(file, headerRow);
        else previewCSV(file, delim, headerRow);
    }
    // (previewCSV and previewExcel are largely same, omitted for brevity, assume standard implementation)
    function previewCSV(file, delimiter, headerRow) {
        Papa.parse(file, {
            preview: 100 + headerRow, delimiter: delimiter === 'auto' ? '' : delimiter, skipEmptyLines: true,
            complete: (results) => {
                try {
                    const rows = results.data;
                    if (!rows || rows.length < headerRow) throw new Error("Not enough rows.");
                    const header = rows[headerRow - 1].map(h => String(h).trim());
                    showPreviewUI(header, rows.slice(headerRow).map(row => { let obj = {}; header.forEach((h, i) => { obj[h] = row[i]; }); return obj; }));
                } catch (err) { alert(err.message); }
            },
            error: (err) => alert(err.message)
        });
    }
    function previewExcel(file, headerRow) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                state.pendingWorkbook = wb;
                state.pendingSheetName = wb.SheetNames[0];
                renderSheetTabs(wb.SheetNames, state.pendingSheetName);
                previewExcelSheet(state.pendingSheetName, headerRow);
            } catch(err) { alert('Error reading Excel: '+err.message); }
        };
        reader.readAsArrayBuffer(file);
    }

    function renderSheetTabs(sheetNames, activeSheet) {
        const bar = document.getElementById('sheetSelectorBar');
        if (!bar) return;
        if (sheetNames.length <= 1) { bar.style.display = 'none'; return; }
        bar.style.display = 'flex';
        bar.innerHTML = '<span style="font-size:11px;font-weight:600;color:#555;align-self:center;margin-right:6px;white-space:nowrap;"><i class="fa-solid fa-table"></i> Sheet:</span>';
        sheetNames.forEach(name => {
            const btn = document.createElement('button');
            btn.textContent = name;
            btn.style.cssText = 'padding:4px 10px;font-size:11px;border-radius:3px;width:auto;flex-shrink:0;' +
                (name === activeSheet
                    ? 'background:#00796b;color:white;'
                    : 'background:#f0f2f5;color:#444;border:1px solid #ddd;');
            btn.onclick = () => {
                state.pendingSheetName = name;
                const headerRow = parseInt(headerRowIndex.value) || 1;
                renderSheetTabs(sheetNames, name);
                previewExcelSheet(name, headerRow);
            };
            bar.appendChild(btn);
        });
    }

    function previewExcelSheet(sheetName, headerRow) {
        const wb = state.pendingWorkbook;
        if (!wb) return;
        try {
            const sheet = wb.Sheets[sheetName];
            if (!sheet) { alert('Sheet "' + sheetName + '" not found.'); return; }
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!json || json.length === 0) { updateStatus('Sheet "' + sheetName + '" is empty.'); return; }
            const hIdx = Math.max(0, headerRow - 1);
            const rawH = json[hIdx] || [];
            const header = rawH.map((h, i) => (h !== undefined && h !== '') ? String(h).trim() : 'Col' + (i + 1));
            const data = json.slice(hIdx + 1)
                .filter(r => r && r.some(v => v !== undefined && v !== ''))
                .map(r => { let o = {}; header.forEach((h, i) => o[h] = r[i] !== undefined ? r[i] : ''); return o; });
            showPreviewUI(header, data);
            updateStatus('Previewing sheet "' + sheetName + '" — ' + data.length + ' rows');
        } catch(err) { alert('Error reading sheet: ' + err.message); }
    }

    function showPreviewUI(columns, data) {
        state.pendingPreviewData = { columns, data };
        let html = '<thead style="background:#f5f5f5"><tr>';
        columns.forEach(col => html += `<th style="padding:5px; border:1px solid #ddd">${col}</th>`);
        html += '</tr></thead><tbody>';
        data.slice(0, 5).forEach(row => {
            html += '<tr>';
            columns.forEach(col => html += `<td style="padding:5px; border:1px solid #ddd">${row[col] !== undefined ? row[col] : ''}</td>`);
            html += '</tr>';
        });
        html += '</tbody>';
        previewTable.innerHTML = html;
        populateSelect(mapXSelect, columns, columns[0]);
        populateSelect(mapYSelect, columns, columns[1] || columns[0]);
        populateSelect(mapY2Select, columns, ''); // Y2 optional
        if (mapY2Select) {
            const noneOpt = document.createElement('option'); noneOpt.value = ''; noneOpt.textContent = '(None)';
            mapY2Select.insertBefore(noneOpt, mapY2Select.firstChild);
            mapY2Select.value = '';
        }

        previewSection.style.display = 'block';
        importBtn.disabled = false;
        updateStatus("Preview generated.");
    }

    function handleImportFull() {
        if (!state.pendingFile) return;
        const file = state.pendingFile;
        const xCol = mapXSelect.value;
        const yCol = mapYSelect.value;
        const y2Col = mapY2Select.value || null; // Capture Y2
        const xLabel = mapXLabel.value || null;
        const yLabel = mapYLabel.value || null;
        const delim = previewDelimiter.value;
        const headerRow = parseInt(headerRowIndex.value);

        // ... (Parsing logic similar to previous, assumes processData calls addFile)
        // Simplified for this replacement block:
        const processData = (jsonData) => {
            // ... (Header extraction logic) ... 
            // Re-implementing minimal robust version for context:
            let header, data;
            const hRowIdx = headerRow > 0 ? headerRow - 1 : -1;
            if (hRowIdx >= 0) {
                header = jsonData[hRowIdx].map(String);
                data = jsonData.slice(headerRow).map(row => { let obj = {}; header.forEach((h, i) => obj[h] = row[i]); return obj; });
            } else {
                const max = jsonData.reduce((m, r) => Math.max(m, r.length), 0);
                header = Array.from({ length: max }, (_, i) => `Column ${i + 1}`);
                data = jsonData.map(row => { let obj = {}; header.forEach((h, i) => obj[h] = row[i]); return obj; });
            }
            addFile(file.name, data, header, xCol, yCol, y2Col, xLabel, yLabel); // Updated signature
        };

        // Trigger Parsing — use cached workbook when available
        const ext = file.name.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(ext)) {
            const importFromWb = (wb) => {
                try {
                    const sheetName = state.pendingSheetName || wb.SheetNames[0];
                    const sheet = wb.Sheets[sheetName];
                    if (!sheet) { alert('Sheet not found: ' + sheetName); return; }
                    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    processData(raw.filter(row => row && row.some(v => v !== undefined && v !== '')));
                } catch (err) { alert('Error reading Excel: ' + err.message); }
            };
            if (state.pendingWorkbook) {
                importFromWb(state.pendingWorkbook);
            } else {
                const r = new FileReader();
                r.onload = e => {
                    try {
                        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                        state.pendingWorkbook = wb;
                        importFromWb(wb);
                    } catch (err) { alert('Error reading Excel: ' + err.message); }
                };
                r.readAsArrayBuffer(file);
            }
        } else {
            Papa.parse(file, {
                delimiter: delim === 'auto' ? '' : delim, skipEmptyLines: true, worker: true,
                complete: res => processData(res.data)
            });
        }
        window.closeCustomImportModal();
    }

    // --- Core Logic ---

    function addFile(name, data, columns, initialX, initialY, initialY2 = null, xLabel = null, yLabel = null) {
        if (!columns || columns.length === 0) return;
        if (!columns.includes(initialX)) initialX = columns[0];
        if (!columns.includes(initialY)) initialY = columns[1] || columns[0];

        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        state.files.push({ id: fileId, name: name, data: data, columns: columns });

        // Initial Style Config
        state.plotConfig[fileId] = {
            xCol: initialX,
            yCol: initialY,
            y2Col: initialY2, // Store Y2 column
            xLabel: xLabel,
            yLabel: yLabel,
            color: colors[(state.files.length - 1) % colors.length],
            traceName: name,
            mode: 'markers',
            lineDash: 'solid',
            lineWidth: 2,
            smoothing: 0,
            smoothingMethod: 'movingAverage',
            sgOrder: 2,
            yaxisSide: 'left',
            peakConfig: { show: false, highlight: false, prominence: 0 }, // Using 'prominence' field for height threshold
            axisLabels: { x: xLabel || initialX, y: yLabel || initialY, y2: 'Secondary Y' },
            enableY2: false,
            visible: true,
            bgCorrection: { method: 'none', params: { radius: 50, order: 2, lam: 1e5, strength: 1.0 }, showBaseline: false },
            axisShift: { xOffset: 0, xScale: 1, yOffset: 0, yScale: 1 },
            errorConfig: { show: false, type: 'symmetric', col: null, colPlus: null, colMinus: null, constant: 0.1, percent: 5 },
            opacity: 1.0,
            multiYCols: [],
            groupedBarMeanSD: false,
            chartType: 'scatter_line'
        };
        state.trendlines[fileId] = 'none';

        renderFileList();
        setActiveFile(fileId);
        updateStatus(`Loaded ${name}.`);
    }

    function renderFileList() {
        if (!fileListEl) return;
        fileListEl.innerHTML = '';
        if (state.files.length === 0) {
            fileListEl.innerHTML = '<li style="color: #999;">No files loaded</li>';
            if (configPanel) configPanel.style.display = 'none';
            const _cfgE2 = document.getElementById('cfg-empty');
            const _cfgC2 = document.getElementById('cfg-content');
            if (_cfgE2) _cfgE2.style.display = 'block';
            if (_cfgC2) _cfgC2.style.display = 'none';
            return;
        }
        state.files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `<span><span class="color-dot" style="background-color:${state.plotConfig[file.id].color}"></span> ${file.name}</span>`;
            if (file.id === state.activeFileId) li.classList.add('active');
            li.onclick = () => setActiveFile(file.id);
            fileListEl.appendChild(li);
        });
        if (configPanel) configPanel.style.display = 'block';
        // Show cfg-content, hide empty state
        const _cfgE = document.getElementById('cfg-empty');
        const _cfgC = document.getElementById('cfg-content');
        if (_cfgE) _cfgE.style.display = 'none';
        if (_cfgC) _cfgC.style.display = 'flex';
    }

    function setActiveFile(id) {
        state.activeFileId = id;
        renderFileList();
        const file = state.files.find(f => f.id === id);
        if (!file) return;
        const config = state.plotConfig[id];

        if (activeFileNameEl) activeFileNameEl.textContent = file.name;
        if (xAxisSelect) populateSelect(xAxisSelect, file.columns, config.xCol);
        if (yAxisSelect) populateSelect(yAxisSelect, file.columns, config.yCol);
        // Multi-Y selector
        const _myS = document.getElementById('y-multi-select');
        if (_myS) {
            _myS.innerHTML = '';
            file.columns.forEach(c => {
                const o = document.createElement('option');
                o.value = c; o.textContent = c;
                if ((config.multiYCols||[]).includes(c)) o.selected = true;
                _myS.appendChild(o);
            });
        }
        // Stats column dropdowns
        ['stats-col-select','test-colA','test-colB'].forEach(sid => {
            const sel = document.getElementById(sid);
            if (sel) { sel.innerHTML = ''; file.columns.forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); }); }
        });
        // Grouped bar checkbox
        const _gbM = document.getElementById('grouped-bar-mode');
        if (_gbM) _gbM.checked = !!(config.groupedBarMeanSD);
        if (trendlineSelect) trendlineSelect.value = state.trendlines[id] || 'none';

        // Sync Style Controls
        if (styleTraceName) styleTraceName.value = config.traceName;
        if (styleColor) styleColor.value = config.color;
        if (styleLineWidth) styleLineWidth.value = config.lineWidth;
        const _chartTypeSel = document.getElementById('chartTypeSelect');
        const _styleSide    = document.getElementById('styleYAxisSide');
        const _styleOp      = document.getElementById('styleOpacity');
        if (_styleSide)    _styleSide.value    = config.yaxisSide || 'left';
        if (_chartTypeSel) _chartTypeSel.value = config.chartType || 'scatter_line';
        if (_styleOp)      _styleOp.value      = Math.round((config.opacity||1)*100);

        // Error bars sync
        const _ebCk = document.getElementById('errorBarsCheck');
        const _etSel= document.getElementById('errorTypeSelect');
        const _ecSel= document.getElementById('errorColSelect');
        const _ecP  = document.getElementById('errorColPlusSelect');
        const _ecM  = document.getElementById('errorColMinusSelect');
        const _ecCo = document.getElementById('errorConstant');
        const _ecPt = document.getElementById('errorPercent');
        const errCfg = config.errorConfig || {};
        if (_ebCk) _ebCk.checked     = !!errCfg.show;
        if (_etSel) _etSel.value     = errCfg.type     || 'symmetric';
        if (_ecCo)  _ecCo.value      = errCfg.constant || 0.1;
        if (_ecPt)  _ecPt.value      = errCfg.percent  || 5;
        if (_ecSel)  populateSelect(_ecSel,  [''].concat(file.columns), errCfg.col     ||'');
        if (_ecP)    populateSelect(_ecP,    [''].concat(file.columns), errCfg.colPlus ||'');
        if (_ecM)    populateSelect(_ecM,    [''].concat(file.columns), errCfg.colMinus||'');
        if (typeof window.syncErrorBarUI === 'function') window.syncErrorBarUI();

        // Y3 label
        const _y3L = document.getElementById('y3AxisLabel');
        if (_y3L && config.axisLabels) _y3L.value = config.axisLabels.y3 || '';

        // Sync Smoothing Controls
        if (smoothingSlider) smoothingSlider.value = config.smoothing || 0;
        if (smoothingValue) smoothingValue.textContent = config.smoothing || 0;
        if (smoothingMethod) {
            smoothingMethod.value = config.smoothingMethod || 'movingAverage';
            if (sgPolyOptions) sgPolyOptions.style.display = smoothingMethod.value === 'savitzkyGolay' ? 'block' : 'none';
        }
        if (sgPolyOrder) sgPolyOrder.value = config.sgOrder || 2;

        // Sync Peak Controls
        if (showPeaksCheck) showPeaksCheck.checked = config.peakConfig.show;
        if (highlightPeaksCheck) highlightPeaksCheck.checked = config.peakConfig.highlight;
        if (peakHeightSlider) {
            peakHeightSlider.value = config.peakConfig.prominence; // Using prominence as height val
            if (peakHeightVal) peakHeightVal.textContent = config.peakConfig.prominence;
        }
        if (peakStatsBox) peakStatsBox.style.display = config.peakConfig.show ? 'block' : 'none';

        // Sync Axis Controls
        if (config.axisLabels) {
            if (xAxisLabelInput) xAxisLabelInput.value = config.axisLabels.x || '';
            if (yAxisLabelInput) yAxisLabelInput.value = config.axisLabels.y || '';
            if (y2AxisLabelInput) y2AxisLabelInput.value = config.axisLabels.y2 || '';
        }
        // enableY2Check removed - using styleYAxisSide per-trace instead

        // Sync BG Correction Controls
        {
            const _bgM = document.getElementById('bg-method');
            if (_bgM && config.bgCorrection) {
                const _p = config.bgCorrection.params || {};
                _bgM.value = config.bgCorrection.method || 'none';
                const _bgR = document.getElementById('bg-radius');
                if (_bgR) { _bgR.value = _p.radius||50; const e=document.getElementById('bg-radius-val'); if(e)e.textContent=_p.radius||50; }
                const _bgO = document.getElementById('bg-order'); if(_bgO) _bgO.value = _p.order||2;
                const _bgL = document.getElementById('bg-lam');
                if (_bgL) { const lv=Math.round(Math.log10(_p.lam||1e5)); _bgL.value=lv; const e=document.getElementById('bg-lam-val'); if(e)e.textContent=lv; }
                const _bgS = document.getElementById('bg-strength');
                if (_bgS) { const sv=Math.round((_p.strength||1)*100); _bgS.value=sv; const e=document.getElementById('bg-strength-val'); if(e)e.textContent=sv; }
                document.getElementById('bg-radius-row').style.display=(['rollingball','als'].includes(_bgM.value))?'block':'none';
                document.getElementById('bg-order-row').style.display=_bgM.value==='polynomial'?'block':'none';
                document.getElementById('bg-lam-row').style.display=_bgM.value==='als'?'block':'none';
                const _bgSB = document.getElementById('bg-show-baseline');
                if (_bgSB) _bgSB.checked = !!(config.bgCorrection.showBaseline);
                const _bgPrev = document.getElementById('bg-prev-plot');
                if (_bgPrev) _bgPrev.style.display = _bgM.value!=='none'?'block':'none';
            }
        }
        // Sync Axis Shift Controls
        {
            const _as = config.axisShift || {};
            const _xo=document.getElementById('axisShiftXOffset'); if(_xo)_xo.value=_as.xOffset||0;
            const _xs=document.getElementById('axisShiftXScale');  if(_xs)_xs.value=_as.xScale!==undefined?_as.xScale:1;
            const _yo=document.getElementById('axisShiftYOffset'); if(_yo)_yo.value=_as.yOffset||0;
            const _ys=document.getElementById('axisShiftYScale');  if(_ys)_ys.value=_as.yScale!==undefined?_as.yScale:1;
        }
        // Sync Trace Visibility
        if (showTraceCheck) {
            showTraceCheck.checked = config.visible !== false; // Default to true if undefined
        }

        renderPlot();
        // If data edit modal is open, refresh it
        if (document.getElementById('dataEditModal')) renderTable();
    }

    function updateActivePeakConfig() {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        config.peakConfig.show = showPeaksCheck.checked;
        config.peakConfig.highlight = highlightPeaksCheck.checked;
        config.peakConfig.prominence = parseInt(peakHeightSlider.value); // Maps to 'min height' logic
        if (peakStatsBox) peakStatsBox.style.display = config.peakConfig.show ? 'block' : 'none';
        renderPlot();
    }

    function updateActiveAxisLabels() {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        if (!config.axisLabels) config.axisLabels = {};
        if (xAxisLabelInput)  config.axisLabels.x  = xAxisLabelInput.value;
        if (y2AxisLabelInput) config.axisLabels.y2 = y2AxisLabelInput.value;
        if (yAxisLabelInput)  config.axisLabels.y  = yAxisLabelInput.value;
        const _y3L = document.getElementById('y3AxisLabel');
        if (_y3L)             config.axisLabels.y3 = _y3L.value;
        renderPlot();
    }

    // ... (rest of simple helpers: updateActiveConfig, removeActiveFile, populateSelect, renderTable, updateActiveSmoothing - same as before) ...
    function updateActiveConfig() { if (!state.activeFileId) return; state.plotConfig[state.activeFileId].xCol = xAxisSelect.value; state.plotConfig[state.activeFileId].yCol = yAxisSelect.value; }
    function updateActiveTrendline() { if (!state.activeFileId) return; state.trendlines[state.activeFileId] = trendlineSelect.value; renderPlot(); }
    function removeActiveFile() { if (!state.activeFileId) return; state.files = state.files.filter(f => f.id !== state.activeFileId); delete state.plotConfig[state.activeFileId]; delete state.trendlines[state.activeFileId]; state.activeFileId = state.files.length ? state.files[0].id : null; renderFileList(); if (state.activeFileId) setActiveFile(state.activeFileId); else Plotly.purge(plotlyDiv); }
    function populateSelect(el, opts, val) { if (!el) return; el.innerHTML = ''; opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; if (o === val) op.selected = true; el.appendChild(op); }); }
    function renderTableLegacy() { /* replaced by modal renderTable below */ }
    function updateActiveSmoothing() { /* Same as before but triggers render */ if (state.activeFileId) { const c = state.plotConfig[state.activeFileId]; c.smoothing = parseInt(smoothingSlider.value); c.smoothingMethod = smoothingMethod.value; c.sgOrder = parseInt(sgPolyOrder.value); if (smoothingValue) smoothingValue.textContent = c.smoothing; if (sgPolyOptions) sgPolyOptions.style.display = c.smoothingMethod === 'savitzkyGolay' ? 'block' : 'none'; renderPlot(); } }


    function renderPlot() {
        if (!plotlyDiv) return;
        const traces = [];
        const downsampleThreshold = 100000;
        let hasY2 = false, hasY3 = false;
        let activeTrendParams = null; // declared before forEach to avoid ReferenceError

        state.files.forEach(file => {
            const config = state.plotConfig[file.id];
            if (config.visible === false) return;

            const chartType = config.chartType || 'scatter_line';
            const yAxisKey  = config.yaxisSide === 'right2' ? 'y3'
                            : config.yaxisSide === 'right'  ? 'y2' : 'y';
            if (yAxisKey === 'y2') hasY2 = true;
            if (yAxisKey === 'y3') { hasY2 = true; hasY3 = true; }

            // ── Histogram ──────────────────────────────────────────────
            if (chartType === 'histogram') {
                const vals = file.data.map(r => parseVal(r[config.yCol])||0);
                traces.push({ x:vals, type:'histogram', name:config.traceName,
                    marker:{color:config.color, opacity:config.opacity||1},
                    yaxis:yAxisKey });
                return;
            }
            // ── Box Plot ───────────────────────────────────────────────
            if (chartType === 'box') {
                const vals = file.data.map(r => parseVal(r[config.yCol])||0);
                traces.push({ y:vals, type:'box', name:config.traceName, boxpoints:'outliers',
                    marker:{color:config.color}, line:{color:config.color},
                    yaxis:yAxisKey, opacity:config.opacity||1 });
                return;
            }
            // ── Violin ─────────────────────────────────────────────────
            if (chartType === 'violin') {
                const vals = file.data.map(r => parseVal(r[config.yCol])||0);
                traces.push({ y:vals, type:'violin', name:config.traceName, points:'outliers',
                    marker:{color:config.color}, line:{color:config.color},
                    fillcolor:hexToRgba(config.color,0.3),
                    yaxis:yAxisKey, opacity:config.opacity||1 });
                return;
            }

            let x = file.data.map(r => r[config.xCol]);
            let y = file.data.map(r => parseVal(r[config.yCol])||0);

            // ── Multi-Y: add extra traces for each additional Y column ──
            const extraYCols = (config.multiYCols||[]).filter(c=>c!==config.yCol);
            if (extraYCols.length > 0 && !config.groupedBarMeanSD) {
                const extraColors = ['#d32f2f','#1976d2','#fbc02d','#7b1fa2','#e64a19','#0097a7','#455a64','#2e7d32'];
                extraYCols.forEach((col, ci) => {
                    const ey = file.data.map(r => parseVal(r[col])||0);
                    const ec2 = extraColors[ci % extraColors.length];
                    const ct2 = config.chartType || 'scatter_line';
                    const yaxisId2 = config.yaxisSide==='right' ? 'y2' : 'y';
                    let t2;
                    if (ct2==='bar') {
                        t2 = {x:x.map(v=>String(v)), y:ey, type:'bar', name:col,
                            marker:{color:ec2, opacity:0.85, line:{color:'rgba(255,255,255,.4)',width:.5}},
                            yaxis:yaxisId2};
                    } else {
                        const modeMap2={scatter_line:'lines',scatter_point:'markers',scatter_both:'lines+markers',lines:'lines',markers:'markers'};
                        t2 = {x, y:ey, type:'scattergl', mode:modeMap2[ct2]||'lines', name:col,
                            marker:{color:ec2,size:(config.lineWidth||2)*2.5},
                            line:{color:ec2,width:config.lineWidth||2},
                            yaxis:yaxisId2};
                    }
                    traces.push(t2);
                });
            }

            // ── Grouped bar from replicates: mean ± SD ─────────────────
            if (config.groupedBarMeanSD && chartType==='bar') {
                const repCols = config.multiYCols && config.multiYCols.length>0
                    ? config.multiYCols
                    : [config.yCol];
                const barLabels = x.map(v=>String(v));
                const means=[], sds=[];
                barLabels.forEach((_,i) => {
                    const vals = repCols.map(c=>parseFloat(file.data[i]?.[c])||0).filter(v=>!isNaN(v));
                    const m = vals.reduce((a,b)=>a+b,0)/vals.length;
                    const sd = vals.length>1 ? Math.sqrt(vals.map(v=>(v-m)**2).reduce((a,b)=>a+b,0)/(vals.length-1)) : 0;
                    means.push(m); sds.push(sd);
                });
                traces.push({
                    x:barLabels, y:means, type:'bar', name:config.traceName+' (mean)',
                    marker:{color:config.color,opacity:0.9,line:{color:'rgba(255,255,255,.4)',width:.5}},
                    error_y:{type:'data',array:sds,visible:true,color:'#333',thickness:1.5,width:6},
                    yaxis: config.yaxisSide==='right' ? 'y2' : 'y'
                });
                return; // skip normal trace building
            }

            // ── Smoothing ──────────────────────────────────────────────
            if (config.smoothing > 0) {
                if (config.smoothingMethod === 'savitzkyGolay') {
                    let w = config.smoothing; if (w%2===0) w++;
                    const o = config.sgOrder||2;
                    if (w > o+2) y = savitzkyGolay(y, w, o);
                } else {
                    y = movingAverage(y, config.smoothing);
                }
            }

            // ── Background correction ──────────────────────────────────
            let bgBaseline = null;
            if (config.bgCorrection && config.bgCorrection.method !== 'none') {
                const bgRes = applyBgCorrectionArr(y, config.bgCorrection.method, config.bgCorrection.params||{});
                bgBaseline = bgRes.baseline;
                y = bgRes.corrected;
            }

            // ── Axis shift/scale ───────────────────────────────────────
            if (config.axisShift) {
                const {xOffset=0,xScale=1,yOffset=0,yScale=1} = config.axisShift;
                if (xOffset!==0||xScale!==1) x = x.map(v=>(parseFloat(v)+xOffset)*xScale);
                if (yOffset!==0||yScale!==1) y = y.map(v=>(v+yOffset)*yScale);
                if (bgBaseline) bgBaseline = bgBaseline.map(v=>(v+yOffset)*yScale);
            }
            const processedY = y;

            // ── Peak Detection ─────────────────────────────────────────
            if (config.peakConfig && config.peakConfig.show) {
                const range = Math.max(...processedY)-Math.min(...processedY);
                const threshold = (config.peakConfig.prominence/100)*range;
                const peaks = findPeaks(processedY, threshold);
                if (file.id === state.activeFileId) {
                    if (peakCountEl) peakCountEl.textContent = peaks.length;
                    if (peaks.length > 0) {
                        const mp = peaks.reduce((p,c)=>c.y>p.y?c:p);
                        if (peakMaxYEl) peakMaxYEl.textContent = parseFloat(processedY[mp.index]).toFixed(3);
                        if (peakMaxXEl) peakMaxXEl.textContent = parseFloat(x[mp.index]).toFixed(3);
                    } else {
                        if (peakMaxYEl) peakMaxYEl.textContent = '-';
                        if (peakMaxXEl) peakMaxXEl.textContent = '-';
                    }
                }
                if (config.peakConfig.highlight && peaks.length>0) {
                    traces.push({
                        x:peaks.map(p=>x[p.index]), y:peaks.map(p=>processedY[p.index]),
                        mode:'markers', type:'scatter', name:config.traceName+' Peaks',
                        marker:{symbol:'triangle-down',size:12,color:'red',line:{width:1,color:'darkred'}},
                        yaxis:yAxisKey, hovertemplate:'Peak<br>X: %{x}<br>Y: %{y}<extra></extra>'
                    });
                }
            }

            // ── Downsample ─────────────────────────────────────────────
            let plotX=x, plotY=[...processedY];
            if (x.length>downsampleThreshold && chartType!=='bar') {
                const d=downsampleData(x,processedY,50000); plotX=d.x; plotY=d.y;
            }

            // ── Error Bars ─────────────────────────────────────────────
            let errorBar;
            const ec = config.errorConfig || {};
            if (ec.show) {
                if (ec.type==='symmetric' && ec.col) {
                    errorBar = { type:'data', array:file.data.map(r=>parseVal(r[ec.col])||0), visible:true, color:config.color };
                } else if (ec.type==='asymmetric' && ec.colPlus && ec.colMinus) {
                    errorBar = { type:'data',
                        array:      file.data.map(r=>parseVal(r[ec.colPlus]) ||0),
                        arrayminus: file.data.map(r=>parseVal(r[ec.colMinus])||0),
                        visible:true, color:config.color };
                } else if (ec.type==='percent') {
                    errorBar = { type:'percent', value:ec.percent||5, visible:true, color:config.color };
                } else if (ec.type==='constant') {
                    errorBar = { type:'constant', value:ec.constant||0, visible:true, color:config.color };
                }
            }

            // ── Main Trace ─────────────────────────────────────────────
            const opacity = config.opacity!==undefined ? config.opacity : 1;
            let trace;

            if (chartType === 'bar') {
                // Each (x_i, y_i) becomes a bar — x values are categorical labels
                const barX = plotX.map(v => String(v));
                // Detect if Y column was originally percent strings → show "%" suffix
                const _isPct = isPercentCol(file, config.yCol);
                if (_isPct) config._yIsPct = true;
                trace = {
                    x: barX, y: plotY, type: 'bar', name: config.traceName,
                    marker: {
                        color: config.color,
                        opacity,
                        line: { color: 'rgba(255,255,255,0.4)', width: 0.5 }
                    },
                    error_y: errorBar, yaxis: yAxisKey,
                    hovertemplate: _isPct
                        ? '%{x}<br>%{y:.2f}%<extra>' + config.traceName + '</extra>'
                        : '%{x}<br>%{y:.4g}<extra>' + config.traceName + '</extra>'
                };

            } else if (chartType === 'area') {
                trace = {
                    x: plotX, y: plotY, type: 'scattergl', mode: 'lines', name: config.traceName,
                    fill: 'tozeroy', fillcolor: hexToRgba(config.color, 0.18),
                    line: { color: config.color, width: config.lineWidth||2, dash: config.lineDash||'solid' },
                    error_y: errorBar, yaxis: yAxisKey, opacity
                };

            } else if (chartType === 'step') {
                trace = {
                    x: plotX, y: plotY, type: 'scatter', mode: 'lines', name: config.traceName,
                    line: { color: config.color, width: config.lineWidth||2, shape: 'hv', dash: config.lineDash||'solid' },
                    error_y: errorBar, yaxis: yAxisKey, opacity
                };

            } else {
                // scatter_line, scatter_point, scatter_both, or legacy 'lines'/'markers'
                const modeMap = {
                    'scatter_line':  'lines',
                    'scatter_point': 'markers',
                    'scatter_both':  'lines+markers',
                    'lines':         'lines',
                    'markers':       'markers',
                    'lines+markers': 'lines+markers'
                };
                const mode = modeMap[chartType] || 'lines';
                trace = {
                    x: plotX, y: plotY, type: 'scattergl', mode, name: config.traceName,
                    marker: { color: config.color, size: (config.lineWidth||2) * 2.5 },
                    line:   { color: config.color, width: config.lineWidth||2, dash: config.lineDash||'solid' },
                    error_y: errorBar, yaxis: yAxisKey, opacity
                };
            }
            traces.push(trace);

            // ── Baseline overlay ───────────────────────────────────────
            if (bgBaseline && config.bgCorrection && config.bgCorrection.showBaseline) {
                let bX=x, bY=bgBaseline;
                if (x.length>downsampleThreshold){const d=downsampleData(x,bgBaseline,50000);bX=d.x;bY=d.y;}
                traces.push({ x:bX, y:bY, mode:'lines', type:'scattergl',
                    name:config.traceName+' baseline',
                    line:{color:config.color,width:1,dash:'dash'}, opacity:0.5,
                    yaxis:yAxisKey, hoverinfo:'skip' });
            }

            // ── Trendline ──────────────────────────────────────────────
            const trendType = state.trendlines[file.id];
            if (trendType && trendType!=='none') {
                const reg = getRegression(x.map(Number), processedY, trendType);
                if (reg) {
                    if (file.id===state.activeFileId) activeTrendParams = reg;
                    const xNum = x.map(Number).filter(v=>!isNaN(v)&&isFinite(v));
                    if (xNum.length>1) {
                        const mn=Math.min(...xNum), mx=Math.max(...xNum);
                        const tX=Array.from({length:150},(_,i)=>mn+i*(mx-mn)/149);
                        traces.push({ x:tX, y:tX.map(v=>reg.fn(v)),
                            mode:'lines', type:'scatter',
                            name:config.traceName+' fit',
                            line:{color:config.color,width:1.5,dash:'dot'},
                            yaxis:yAxisKey, opacity:0.85,
                            hovertemplate:reg.eqnStr+'<extra>Fit</extra>' });
                    }
                }
            }
        });

        // ── Axis titles ────────────────────────────────────────────────
        let xTitle='X', yTitle='Y', y2Title='Y2', y3Title='Y3';
        if (state.activeFileId) {
            const c=state.plotConfig[state.activeFileId];
            const al=c.axisLabels||{};
            xTitle  = al.x  || c.xLabel || c.xCol || 'X';
            yTitle  = al.y  || c.yLabel || c.yCol || 'Y';
            y2Title = al.y2 || 'Y2';
            y3Title = al.y3 || 'Y3';
        }
        const rightMargin = hasY3 ? 120 : hasY2 ? 75 : 40;

        // Detect if any active trace is a bar chart (affects layout)
        const hasBarTrace = state.files.some(f => {
            const ct = (state.plotConfig[f.id]||{}).chartType || 'scatter_line';
            return ct === 'bar';
        });
        // For bar charts with categorical x, suppress numeric tickformat
        const xTickFormat = hasBarTrace ? '' : ',';

        const pa = typeof plotAppearance !== 'undefined' ? plotAppearance : {};
        const layout = {
            autosize: true, height: (pa.height||580),
            margin: { t: 40, r: rightMargin, b: 60, l: 70 },
            barmode: 'group',   // multiple bar series sit side-by-side
            bargap: 0.15,       // gap between bar groups
            bargroupgap: 0.05,
            xaxis: {
                title: { text: xTitle, font:{size:(pa.fontSize||12)+1} }, gridcolor: '#eee',
                showgrid: pa.showGridX!==false, zeroline: pa.zeroLine!==false,
                tickformat: xTickFormat,
                range: (state.xaxisRange.start!==null || state.xaxisRange.end!==null)
                    ? [state.xaxisRange.start??undefined, state.xaxisRange.end??undefined]
                    : undefined,
                showspikes: true, spikemode: 'across', spikethickness: 1, spikedash: 'dash', spikecolor: '#aaa'
            },
            yaxis:  { title: { text: yTitle, font:{size:(pa.fontSize||12)+1} },  gridcolor: '#eee',
                showgrid: pa.showGridY!==false, zeroline: pa.zeroLine!==false,
                ticksuffix: state.files.some(f=>(state.plotConfig[f.id]||{})._yIsPct) ? '%' : '',
                showspikes: true, spikethickness: 1, spikedash: 'dash', spikecolor: '#aaa' },
            yaxis2: { title: { text: y2Title }, overlaying: 'y', side: 'right',  showgrid: false, visible: hasY2 },
            yaxis3: { title: { text: y3Title }, overlaying: 'y', side: 'right',  showgrid: false, visible: hasY3, position: 0.93 },
            legend: { x: 0, y: 1.1, orientation: 'h', font: { size: 11 } },
            paper_bgcolor: pa.paperColor||'#fff',
            plot_bgcolor: pa.bgColor||'#fcfcfc',
            font: { family: pa.fontFamily||'Arial', size: pa.fontSize||12 },
            showlegend: pa.showLegend !== false,
            hovermode: hasBarTrace ? 'closest' : 'x unified',
            uirevision: state.activeFileId,
            annotations: state.showLabels ? state.annotations.filter(ann => {
                const f = state.files.find(f => f.id === ann.fileId);
                if (!f) return !ann.fileId;
                return (state.plotConfig[f.id]||{}).visible !== false;
            }) : []
        };

        Plotly.react(plotlyDiv, traces, layout, {responsive:true, scrollZoom:true});

        if (state.labelMode) {
            plotlyDiv.on('plotly_click', data=>{
                const pt=data.points[0];
                const labelText=prompt('Label text:','Peak');
                if (labelText!==null) {
                    const showX=confirm('Include X value?');
                    const showY=confirm('Include Y value?');
                    let displayText=labelText;
                    if(showX&&showY) displayText+=`\nX: ${parseFloat(pt.x).toFixed(3)}\nY: ${parseFloat(pt.y).toFixed(3)}`;
                    else if(showX)   displayText+=`\nX: ${parseFloat(pt.x).toFixed(3)}`;
                    else if(showY)   displayText+=`\nY: ${parseFloat(pt.y).toFixed(3)}`;
                    state.annotations.push({
                        id:Date.now(), fileId:state.activeFileId,
                        x:pt.x, y:pt.y, text:displayText, customText:labelText,
                        showX, showY, showarrow:true, arrowhead:2, ax:0, ay:-40,
                        font:{size:12,color:'black'}, bgcolor:'rgba(255,255,255,0.9)',
                        bordercolor:'black', borderwidth:1
                    });
                    renderPlot();
                    updateStatus('Label added: '+labelText);
                }
            });
        } else {
            plotlyDiv.removeAllListeners('plotly_click');
        }

        if (trendlineStats) {
            trendlineStats.style.display = activeTrendParams ? 'block' : 'none';
            if (activeTrendParams) trendlineStats.innerHTML=
                `<strong>Fit:</strong> ${activeTrendParams.eqnStr}<br><strong>R²:</strong> ${activeTrendParams.r2.toFixed(4)}`;
        }
    }

    function hexToRgba(hex, alpha) {
        const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${alpha})`;
    }


    function movingAverage(data, windowSize) {
        if (windowSize <= 1 || data.length < windowSize) return data;
        const len = data.length;
        const result = new Array(len);
        const halfWindow = Math.floor(windowSize / 2);

        // Precompute Prefix Sums
        const prefixSum = new Float64Array(len + 1);
        prefixSum[0] = 0;
        for (let i = 0; i < len; i++) {
            prefixSum[i + 1] = prefixSum[i] + data[i];
        }

        for (let i = 0; i < len; i++) {
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(len, i + halfWindow + 1);
            const count = end - start;
            const sum = prefixSum[end] - prefixSum[start];
            result[i] = sum / count;
        }
        return result;
    }

    function savitzkyGolay(data, windowSize, order) {
        if (windowSize % 2 === 0) windowSize++;
        const half = (windowSize - 1) / 2;
        const result = new Array(data.length).fill(0);

        for (let i = 0; i < data.length; i++) {
            // Simple Order 2/3 implementation
            if (order === 2 || order === 3) {
                const m = half;
                let num = 0;
                let den = 0;
                for (let j = -m; j <= m; j++) {
                    if (i + j < 0 || i + j >= data.length) continue;
                    const weight = 3 * (3 * m * m + 3 * m - 1 - 5 * j * j);
                    num += weight * data[i + j];
                    den += weight;
                }
                result[i] = den === 0 ? data[i] : num / den;
            } else {
                // Fallback to Moving Average if order not supported in this simplified block
                // (or could implement full matrix inversion, but sticking to previous working logic)
                const s = Math.max(0, i - half);
                const e = Math.min(data.length, i + half + 1);
                const sub = data.slice(s, e);
                result[i] = sub.reduce((a, b) => a + b, 0) / sub.length;
            }
        }
        return result;
    }

    function downsampleData(x, y, targetCount) {
        if (x.length <= targetCount) return { x, y };
        const bucketSize = Math.floor(x.length / targetCount);
        const sampledX = [];
        const sampledY = [];

        for (let i = 0; i < x.length; i += bucketSize) {
            const end = Math.min(i + bucketSize, x.length);
            let minVal = Infinity, maxVal = -Infinity;
            let minIdx = -1, maxIdx = -1;

            for (let j = i; j < end; j++) {
                if (y[j] < minVal) { minVal = y[j]; minIdx = j; }
                if (y[j] > maxVal) { maxVal = y[j]; maxIdx = j; }
            }

            if (minIdx !== -1) {
                if (minIdx < maxIdx) {
                    sampledX.push(x[minIdx]); sampledY.push(y[minIdx]);
                    if (minIdx !== maxIdx) { sampledX.push(x[maxIdx]); sampledY.push(y[maxIdx]); }
                } else {
                    sampledX.push(x[maxIdx]); sampledY.push(y[maxIdx]);
                    if (minIdx !== maxIdx) { sampledX.push(x[minIdx]); sampledY.push(y[minIdx]); }
                }
            }
        }
        return { x: sampledX, y: sampledY };
    }

    function findPeaks(data, prominenceThreshold) {
        const peaks = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
                let lMin = data[i], rMin = data[i];
                for (let l = i - 1; l >= 0; l--) {
                    if (data[l] > data[i]) break;
                    if (data[l] < lMin) lMin = data[l];
                }
                for (let r = i + 1; r < data.length; r++) {
                    if (data[r] > data[i]) break;
                    if (data[r] < rMin) rMin = data[r];
                }
                const prom = Math.min(data[i] - lMin, data[i] - rMin);
                if (prom >= prominenceThreshold) {
                    peaks.push({ index: i, y: data[i], x: i });
                }
            }
        }
        return peaks;
    }

    function getRegression(x, y, type) {
        const N = x.length;
        let X = x, Y = y;
        if (type === 'logarithmic') X = x.map(Math.log);
        else if (type === 'exponential') Y = y.map(Math.log);
        else if (type === 'power') { X = x.map(Math.log); Y = y.map(Math.log); }

        let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0, sum_yy = 0;
        let validN = 0;
        for (let i = 0; i < N; i++) {
            if (isNaN(X[i]) || isNaN(Y[i]) || !isFinite(X[i]) || !isFinite(Y[i])) continue;
            sum_x += X[i]; sum_y += Y[i]; sum_xy += X[i] * Y[i]; sum_xx += X[i] * X[i]; sum_yy += Y[i] * Y[i];
            validN++;
        }
        if (validN < 2) return null;

        const slope = (validN * sum_xy - sum_x * sum_y) / (validN * sum_xx - sum_x * sum_x);
        const intercept = (sum_y - slope * sum_x) / validN;
        const r2 = Math.pow((validN * sum_xy - sum_x * sum_y) / Math.sqrt((validN * sum_xx - sum_x * sum_x) * (validN * sum_yy - sum_y * sum_y) || 1), 2);

        let a, b, eqnStr, fn;
        if (type === 'linear') { b = slope; a = intercept; eqnStr = `y=${b.toFixed(4)}x+${a.toFixed(4)}`; fn = v => b * v + a; }
        else if (type === 'logarithmic') { b = slope; a = intercept; eqnStr = `y=${a.toFixed(4)}+${b.toFixed(4)}ln(x)`; fn = v => a + b * Math.log(v); }
        else if (type === 'exponential') { b = slope; a = Math.exp(intercept); eqnStr = `y=${a.toFixed(4)}e^(${b.toFixed(4)}x)`; fn = v => a * Math.exp(b * v); }
        else if (type === 'power') { b = slope; a = Math.exp(intercept); eqnStr = `y=${a.toFixed(4)}x^${b.toFixed(4)}`; fn = v => a * Math.pow(v, b); }

        return { r2, eqnStr, fn };
    }


    // ════════════════════════════════════════════════════════════════
    //  TAB SWITCHING
    // ════════════════════════════════════════════════════════════════
    window.switchTab = (name) => {
        ['data','configure','analysis','stats','export'].forEach(t => {
            const btn  = document.getElementById('tabbtn-'+t);
            const pane = document.getElementById('tab-'+t);
            if (btn)  btn.classList.toggle('active',  t===name);
            if (pane) pane.classList.toggle('active', t===name);
        });
    };

    window.switchImgTab = (name) => {
        ['setup','xcal','ycal','bgcor'].forEach(t => {
            const btn  = document.getElementById('imgtab-btn-'+t);
            const pane = document.getElementById('imgtab-'+t);
            if (btn)  btn.classList.toggle('active',  t===name);
            if (pane) { pane.style.display = t===name ? 'flex' : 'none'; pane.classList.toggle('active', t===name); }
        });
    };

    // ════════════════════════════════════════════════════════════════
    //  AXIS SHIFT / RESCALE
    // ════════════════════════════════════════════════════════════════
    window.applyAxisShift = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        config.axisShift = {
            xOffset: parseFloat(document.getElementById('axisShiftXOffset').value) || 0,
            xScale:  parseFloat(document.getElementById('axisShiftXScale').value)  || 1,
            yOffset: parseFloat(document.getElementById('axisShiftYOffset').value) || 0,
            yScale:  parseFloat(document.getElementById('axisShiftYScale').value)  || 1,
        };
        renderPlot();
        updateStatus('Axis shift applied.');
    };

    window.resetAxisShift = () => {
        if (!state.activeFileId) return;
        state.plotConfig[state.activeFileId].axisShift = { xOffset:0, xScale:1, yOffset:0, yScale:1 };
        document.getElementById('axisShiftXOffset').value = 0;
        document.getElementById('axisShiftXScale').value  = 1;
        document.getElementById('axisShiftYOffset').value = 0;
        document.getElementById('axisShiftYScale').value  = 1;
        renderPlot();
        updateStatus('Axis shift reset.');
    };

    // ════════════════════════════════════════════════════════════════
    //  BACKGROUND CORRECTION (main panel)
    // ════════════════════════════════════════════════════════════════
    window.updateBgCorrection = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        const method = document.getElementById('bg-method').value;
        const radius = parseInt(document.getElementById('bg-radius').value) || 50;
        const order  = parseInt(document.getElementById('bg-order').value)  || 2;
        const lam    = Math.pow(10, parseInt(document.getElementById('bg-lam').value) || 5);
        const strength = parseInt(document.getElementById('bg-strength').value) / 100;
        const showBL = document.getElementById('bg-show-baseline').checked;
        config.bgCorrection = { method, params:{radius,order,lam,strength}, showBaseline: showBL };

        document.getElementById('bg-radius-row').style.display = (['rollingball','als'].includes(method)) ? 'block' : 'none';
        document.getElementById('bg-order-row').style.display  = method==='polynomial' ? 'block' : 'none';
        document.getElementById('bg-lam-row').style.display    = method==='als'  ? 'block' : 'none';

        const prevBox = document.getElementById('bg-prev-plot');
        if (prevBox) prevBox.style.display = method!=='none' ? 'block' : 'none';

        // Update mini baseline preview (same style as image modal)
        if (method !== 'none' && prevBox) {
            const file = state.files.find(f => f.id === state.activeFileId);
            if (file) {
                let rawX = file.data.map(r => r[config.xCol]);
                let rawY = file.data.map(r => parseVal(r[config.yCol]) || 0);
                if (rawX.length > 2000) {
                    const step = Math.floor(rawX.length / 2000);
                    rawX = rawX.filter((_,i)=>i%step===0);
                    rawY = rawY.filter((_,i)=>i%step===0);
                }
                const { corrected, baseline } = applyBgCorrectionArr(rawY, method, {radius,order,lam,strength});
                Plotly.react(prevBox, [
                    { x:rawX, y:rawY,       name:'Raw',       mode:'lines', line:{color:'#bdbdbd',width:1}, opacity:.7 },
                    { x:rawX, y:baseline,   name:'Baseline',  mode:'lines', line:{color:'#1976d2',width:1,dash:'dash'} },
                    { x:rawX, y:corrected,  name:'Corrected', mode:'lines', line:{color:'#d32f2f',width:1.5} }
                ], {
                    height:120, margin:{t:8,r:8,b:28,l:40},
                    legend:{x:0,y:1.3,orientation:'h',font:{size:9}},
                    xaxis:{title:{text:config.axisLabels&&config.axisLabels.x||config.xCol,font:{size:9}}},
                    yaxis:{title:{text:'',font:{size:9}}},
                    paper_bgcolor:'#fff', plot_bgcolor:'#fcfcfc'
                }, {responsive:true, displayModeBar:false});
            }
        }
        renderPlot();
    };

    // ════════════════════════════════════════════════════════════════
    //  IMAGE ANALYSIS STATE & HELPERS
    // ════════════════════════════════════════════════════════════════
    const imgState = {
        imageData: null, W: 0, H: 0,
        targetColor: { r:140, g:50, b:100 },
        tolerance: 40,
        bounds: { left:65, right:1400, top:10, bottom:290 },
        pickingMode: null,   // null | 'color' | 'x1' | 'x2' | 'y1' | 'y2'
        extractedX: [], extractedY: [], correctedY: [], baseline: []
    };

    window.openImageModal = () => {
        const modal = document.getElementById('imageAnalysisModal');
        if (modal) modal.style.display = 'block';
        document.getElementById('img-upload-zone').style.display = 'block';
        document.getElementById('img-workspace').style.display   = 'none';
    };

    window.closeImageModal = () => {
        const modal = document.getElementById('imageAnalysisModal');
        if (modal) modal.style.display = 'none';
        imgState.pickingMode = null;
        updateImgPickingUI();
    };

    window.loadSpectrumImage = (file) => {
        if (!file) return;
        document.getElementById('img-upload-zone').style.display = 'none';
        document.getElementById('img-workspace').style.display   = 'block';
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas  = document.getElementById('imageCanvas');
                const overlay = document.getElementById('overlayCanvas');
                const maxW    = Math.min(780, img.width);
                const scale   = maxW / img.width;
                const dw = Math.round(img.width  * scale);
                const dh = Math.round(img.height * scale);
                canvas.width  = overlay.width  = dw;
                canvas.height = overlay.height = dh;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, dw, dh);
                imgState.imageData = ctx.getImageData(0, 0, dw, dh);
                imgState.W = dw; imgState.H = dh;
                imgState.bounds = {
                    left:   Math.round(0.04*dw),
                    right:  Math.round(0.97*dw),
                    top:    Math.round(0.03*dh),
                    bottom: Math.round(0.90*dh)
                };
                syncBoundInputs();
                autoDetectSpectrumColor();
                extractAndPreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.startColorPick = () => {
        imgState.pickingMode = 'color';
        updateImgPickingUI();
        updateStatus('Click on the spectrum line to pick its color');
    };

    window.startCalPick = (pt, axis) => {
        imgState.pickingMode = axis + pt;   // 'x1','x2','y1','y2'
        updateImgPickingUI();
        updateStatus(`Click image to set ${axis.toUpperCase()} calibration point ${pt}`);
    };

    window.onManualColorPick = (hex) => {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        imgState.targetColor = {r,g,b};
        document.getElementById('imgColorSwatch').style.background = `rgb(${r},${g},${b})`;
        extractAndPreview();
    };

    window.onImgBgMethodChange = () => {
        const m = document.getElementById('img-bg-method').value;
        document.getElementById('img-bg-radius-row').style.display = (['rollingball','als'].includes(m)) ? 'block' : 'none';
        document.getElementById('img-bg-order-row').style.display  = m==='polynomial' ? 'block' : 'none';
        document.getElementById('img-bg-lam-row').style.display    = m==='als' ? 'block' : 'none';
    };

    window.updateBoundsFromInputs = () => {
        imgState.bounds = {
            left:   parseInt(document.getElementById('img-bound-left').value)   || 0,
            right:  parseInt(document.getElementById('img-bound-right').value)  || imgState.W,
            top:    parseInt(document.getElementById('img-bound-top').value)    || 0,
            bottom: parseInt(document.getElementById('img-bound-bottom').value) || imgState.H
        };
        extractAndPreview();
    };

    window.autoDetectBounds = () => {
        if (!imgState.imageData) return;
        const data = imgState.imageData.data;
        const W = imgState.W, H = imgState.H;
        let minX=W, maxX=0, minY=H, maxY=0;
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
            const i=(y*W+x)*4;
            if (data[i]<235||data[i+1]<235||data[i+2]<235) {
                if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
            }
        }
        imgState.bounds = { left:Math.max(0,minX+5), right:Math.min(W,maxX-5), top:Math.max(0,minY+2), bottom:Math.min(H,maxY-5) };
        syncBoundInputs();
        extractAndPreview();
        updateStatus('Bounds auto-detected');
    };

    window.extractAndPreview = () => {
        if (!imgState.imageData) return;
        const {x, y} = doExtractSpectrum();
        if (x.length === 0) {
            document.getElementById('img-points-count').textContent = 'No spectrum detected — adjust color or tolerance';
            return;
        }
        const method   = document.getElementById('img-bg-method').value;
        const radius   = parseInt(document.getElementById('img-bg-radius').value)   || 50;
        const order    = parseInt(document.getElementById('img-bg-order').value)    || 2;
        const lam      = Math.pow(10, parseInt(document.getElementById('img-bg-lam').value) || 5);
        const strength = parseInt(document.getElementById('img-bg-strength').value) / 100;
        const {corrected, baseline} = applyBgCorrectionArr(y, method, {radius,order,lam,strength});
        imgState.extractedX = x;
        imgState.extractedY = y;
        imgState.correctedY = corrected;
        imgState.baseline   = baseline;
        drawOverlay();
        updateImagePreviewPlot(x, y, corrected, baseline);
        document.getElementById('img-points-count').textContent = x.length + ' data points extracted';
    };

    window.importImageData = () => {
        const x = imgState.extractedX;
        const y = (imgState.correctedY && imgState.correctedY.length>0) ? imgState.correctedY : imgState.extractedY;
        if (!x || x.length===0) { alert('No spectrum detected.'); return; }
        const name   = document.getElementById('imgDatasetName').value || 'Image Spectrum';
        const xLabel = document.getElementById('img-x-label').value || 'X';
        const yLabel = document.getElementById('img-y-label').value || 'Intensity';
        const data   = x.map((v,i) => ({ [xLabel]: v, [yLabel]: y[i] }));
        addFile(name, data, [xLabel, yLabel], xLabel, yLabel, null, xLabel, yLabel);
        window.closeImageModal();
        updateStatus(`Imported "${name}" — ${x.length} points`);
    };

    // Canvas click/move listeners (IIFE so they run once on page load)
    (function attachCanvasListeners() {
        const canvas = document.getElementById('imageCanvas');
        if (!canvas) return;
        canvas.addEventListener('click', (e) => {
            if (!imgState.imageData || !imgState.pickingMode) return;
            const rect = canvas.getBoundingClientRect();
            const sx = canvas.width  / rect.width;
            const sy = canvas.height / rect.height;
            const px = Math.round((e.clientX - rect.left) * sx);
            const py = Math.round((e.clientY - rect.top)  * sy);

            const mode = imgState.pickingMode;
            if (mode === 'color') {
                const d = imgState.imageData.data;
                const i = (py*imgState.W+px)*4;
                const r=d[i],g=d[i+1],b=d[i+2];
                imgState.targetColor = {r,g,b};
                const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
                document.getElementById('imgColorSwatch').style.background=`rgb(${r},${g},${b})`;
                document.getElementById('imgColorPicker').value=hex;
                updateStatus(`Color picked: rgb(${r},${g},${b})`);
            } else if (mode==='x1') {
                document.getElementById('img-cal-px1').value=px;
                updateStatus('X cal pt 1 → pixel x='+px);
            } else if (mode==='x2') {
                document.getElementById('img-cal-px2').value=px;
                updateStatus('X cal pt 2 → pixel x='+px);
            } else if (mode==='y1') {
                document.getElementById('img-cal-py1').value=py;
                updateStatus('Y cal pt 1 → pixel y='+py);
            } else if (mode==='y2') {
                document.getElementById('img-cal-py2').value=py;
                updateStatus('Y cal pt 2 → pixel y='+py);
            }
            imgState.pickingMode = null;
            updateImgPickingUI();
            extractAndPreview();
        });
        canvas.addEventListener('mousemove', () => {
            canvas.style.cursor = imgState.pickingMode ? 'crosshair' : 'default';
        });
    })();

    // ── Image Helper Functions ────────────────────────────────────────────
    function syncBoundInputs() {
        const b = imgState.bounds;
        ['left','right','top','bottom'].forEach(k => {
            const el = document.getElementById('img-bound-'+k);
            if (el) el.value = b[k];
        });
    }

    function updateImgPickingUI() {
        const m = imgState.pickingMode;
        const colorBtn = document.getElementById('img-pick-color-btn');
        if (colorBtn) {
            colorBtn.style.background = m==='color' ? '#d32f2f' : '#7b3fa0';
            colorBtn.style.color = 'white';
            colorBtn.textContent = m==='color' ? '🎯 Click image...' : '🖱️ Click Image to Pick Color';
        }
        const canvas = document.getElementById('imageCanvas');
        if (canvas) canvas.style.cursor = m ? 'crosshair' : 'default';
        // X cal buttons
        const xb1=document.getElementById('img-cal-btn-1');   if(xb1) xb1.style.background=m==='x1'?'#d32f2f':'#0288d1';
        const xb2=document.getElementById('img-cal-btn-2');   if(xb2) xb2.style.background=m==='x2'?'#d32f2f':'#2e7d32';
        // Y cal buttons
        const yb1=document.getElementById('img-ycal-btn-1'); if(yb1) yb1.style.background=m==='y1'?'#d32f2f':'#e65100';
        const yb2=document.getElementById('img-ycal-btn-2'); if(yb2) yb2.style.background=m==='y2'?'#d32f2f':'#6a1b9a';
    }

    function autoDetectSpectrumColor() {
        if (!imgState.imageData) return;
        const data = imgState.imageData.data;
        const W = imgState.W;
        const { left, right, top, bottom } = imgState.bounds;
        let best = { r:140, g:50, b:100, score:0 };
        const step = Math.max(1, Math.round((right-left)/30));
        for (let px=left; px<=right; px+=step) {
            for (let py=top; py<=bottom; py++) {
                const i=(py*W+px)*4;
                const r=data[i],g=data[i+1],b=data[i+2];
                if (r>240&&g>240&&b>240) continue;
                const score=Math.abs(r-g)+Math.abs(g-b)+Math.abs(r-b);
                if (score>best.score) best={r,g,b,score};
            }
        }
        imgState.targetColor = {r:best.r,g:best.g,b:best.b};
        const hex='#'+[best.r,best.g,best.b].map(v=>v.toString(16).padStart(2,'0')).join('');
        const sw=document.getElementById('imgColorSwatch');  if(sw) sw.style.background=`rgb(${best.r},${best.g},${best.b})`;
        const pk=document.getElementById('imgColorPicker');  if(pk) pk.value=hex;
    }

    function doExtractSpectrum() {
        if (!imgState.imageData) return {x:[],y:[]};
        const data=imgState.imageData.data;
        const W=imgState.W;
        const {left,right,top,bottom}=imgState.bounds;
        const {r:tr,g:tg,b:tb}=imgState.targetColor;
        const tol=parseFloat(document.getElementById('img-tolerance').value||40);
        imgState.tolerance=tol;
        const xPixels=[],yPixels=[];
        for (let px=left;px<=right;px++) {
            let bestRow=-1,bestDist=tol+1;
            for (let py=top;py<=bottom;py++) {
                const i=(py*W+px)*4;
                const dist=Math.sqrt((data[i]-tr)**2+(data[i+1]-tg)**2+(data[i+2]-tb)**2);
                if(dist<bestDist){bestDist=dist;bestRow=py;}
            }
            if(bestRow!==-1&&bestDist<tol){xPixels.push(px);yPixels.push(bestRow);}
        }
        // X calibration
        const px1=parseFloat(document.getElementById('img-cal-px1').value);
        const v1 =parseFloat(document.getElementById('img-cal-v1').value);
        const px2=parseFloat(document.getElementById('img-cal-px2').value);
        const v2 =parseFloat(document.getElementById('img-cal-v2').value);
        let xValues;
        if(!isNaN(px1)&&!isNaN(v1)&&!isNaN(px2)&&!isNaN(v2)&&px1!==px2) {
            const xScale=(v2-v1)/(px2-px1);
            xValues=xPixels.map(p=>v1+(p-px1)*xScale);
        } else {
            xValues=xPixels.map(p=>p-left);
        }
        // Y calibration (pixel row → real value; row increases downward, value increases upward)
        const py1=parseFloat(document.getElementById('img-cal-py1').value);
        const yv1=parseFloat(document.getElementById('img-cal-yv1').value);
        const py2=parseFloat(document.getElementById('img-cal-py2').value);
        const yv2=parseFloat(document.getElementById('img-cal-yv2').value);
        let yValues;
        if(!isNaN(py1)&&!isNaN(yv1)&&!isNaN(py2)&&!isNaN(yv2)&&py1!==py2) {
            const yScale=(yv2-yv1)/(py2-py1);   // pixel → value (may be negative since Y axis is inverted)
            yValues=yPixels.map(p=>yv1+(p-py1)*yScale);
        } else {
            // Default: normalize 0–1 (fraction of plot height, bottom = 0, top = 1)
            yValues=yPixels.map(p=>(bottom-p)/(bottom-top));
        }
        return {x:xValues,y:yValues};
    }

    function drawOverlay() {
        const oc=document.getElementById('overlayCanvas');
        if(!oc||!imgState.imageData)return;
        const ctx=oc.getContext('2d');
        const {W,H,bounds:b}=imgState;
        ctx.clearRect(0,0,W,H);
        // Boundary box
        ctx.save();ctx.strokeStyle='rgba(30,100,255,.8)';ctx.lineWidth=1.5;ctx.setLineDash([6,3]);
        ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);ctx.restore();
        // Detected spectrum line
        const data=imgState.imageData.data;
        const {r:tr,g:tg,b:tb}=imgState.targetColor;
        const tol=imgState.tolerance;
        ctx.beginPath();let first=true;
        for(let px=b.left;px<=b.right;px++){
            let bestRow=-1,bestDist=tol+1;
            for(let py=b.top;py<=b.bottom;py++){
                const i=(py*W+px)*4;
                const dist=Math.sqrt((data[i]-tr)**2+(data[i+1]-tg)**2+(data[i+2]-tb)**2);
                if(dist<bestDist){bestDist=dist;bestRow=py;}
            }
            if(bestRow!==-1&&bestDist<tol){if(first){ctx.moveTo(px,bestRow);first=false;}else ctx.lineTo(px,bestRow);}
            else first=true;
        }
        ctx.strokeStyle='rgba(255,50,50,.9)';ctx.lineWidth=2;ctx.stroke();
        // X cal lines (cyan, green)
        [[document.getElementById('img-cal-px1'),document.getElementById('img-cal-v1'),'#00acc1','X1'],
         [document.getElementById('img-cal-px2'),document.getElementById('img-cal-v2'),'#43a047','X2']].forEach(([pxEl,vEl,color,lbl])=>{
            const px=parseFloat(pxEl?.value);
            if(!isNaN(px)){
                ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([4,2]);
                ctx.beginPath();ctx.moveTo(px,b.top);ctx.lineTo(px,b.bottom);ctx.stroke();
                ctx.fillStyle=color;ctx.font='bold 10px Arial';
                ctx.fillText(lbl+(vEl?.value?'='+vEl.value:''),px+2,b.top+11);ctx.restore();
            }
        });
        // Y cal lines (orange, purple) — horizontal
        [[document.getElementById('img-cal-py1'),document.getElementById('img-cal-yv1'),'#e65100','Y1'],
         [document.getElementById('img-cal-py2'),document.getElementById('img-cal-yv2'),'#6a1b9a','Y2']].forEach(([pyEl,vEl,color,lbl])=>{
            const py=parseFloat(pyEl?.value);
            if(!isNaN(py)){
                ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([4,2]);
                ctx.beginPath();ctx.moveTo(b.left,py);ctx.lineTo(b.right,py);ctx.stroke();
                ctx.fillStyle=color;ctx.font='bold 10px Arial';
                ctx.fillText(lbl+(vEl?.value?'='+vEl.value:''),b.left+2,py-2);ctx.restore();
            }
        });
    }

    function updateImagePreviewPlot(rawX, rawY, correctedY, baseline) {
        const div=document.getElementById('imagePreviewPlot');
        if(!div)return;
        const yLabel=document.getElementById('img-y-label')?.value||'Intensity';
        const xLabel=document.getElementById('img-x-label')?.value||'X';
        const traces=[
            {x:rawX,y:rawY,     name:'Raw',      mode:'lines',line:{color:'#bdbdbd',width:1},opacity:.7},
            {x:rawX,y:correctedY,name:'Corrected',mode:'lines',line:{color:'#d32f2f',width:2}}
        ];
        if(baseline&&baseline.length===rawY.length)
            traces.push({x:rawX,y:baseline,name:'Baseline',mode:'lines',line:{color:'#1976d2',width:1,dash:'dash'}});
        Plotly.react(div,traces,{
            height:190,margin:{t:10,r:12,b:36,l:48},
            xaxis:{title:{text:xLabel,font:{size:10}}},
            yaxis:{title:{text:yLabel,font:{size:10}}},
            legend:{x:0,y:1.25,orientation:'h',font:{size:10}},
            paper_bgcolor:'#fff',plot_bgcolor:'#fcfcfc'
        },{responsive:true,displayModeBar:false});
    }

    // ════════════════════════════════════════════════════════════════
    //  BACKGROUND CORRECTION ALGORITHMS
    // ════════════════════════════════════════════════════════════════
    function applyBgCorrectionArr(y, method, params) {
        const n=y.length;
        if(n===0||method==='none')return{corrected:[...y],baseline:new Array(n).fill(0)};
        const strength=params.strength!==undefined?params.strength:1.0;
        let baseline;
        if(method==='linear')       baseline=Array.from({length:n},(_,i)=>y[0]+(y[n-1]-y[0])*i/(n-1));
        else if(method==='rollingball') baseline=rollingBallBaseline(y,Math.max(1,Math.round(params.radius||50)));
        else if(method==='polynomial')  baseline=iterativePolynomialBaseline(y,Math.max(1,Math.min(6,params.order||2)),12);
        else if(method==='als')         baseline=alsBaseline(y,params.lam||1e5,0.01,10);
        else baseline=new Array(n).fill(0);
        const corrected=y.map((v,i)=>Math.max(0,v-baseline[i]*strength));
        return{corrected,baseline};
    }

    function rollingBallBaseline(y,radius){
        const n=y.length;
        let bl=Float64Array.from(y);
        for(let iter=0;iter<15;iter++){
            const minned=new Float64Array(n);
            for(let i=0;i<n;i++){
                const s=Math.max(0,i-radius),e=Math.min(n-1,i+radius);
                let mn=Infinity;
                for(let j=s;j<=e;j++)if(bl[j]<mn)mn=bl[j];
                minned[i]=mn;
            }
            const hw=Math.max(1,Math.round(radius*.4));
            const pfx=new Float64Array(n+1);
            for(let i=0;i<n;i++)pfx[i+1]=pfx[i]+minned[i];
            const smoothed=new Float64Array(n);
            for(let i=0;i<n;i++){
                const s=Math.max(0,i-hw),e=Math.min(n-1,i+hw);
                smoothed[i]=(pfx[e+1]-pfx[s])/(e-s+1);
            }
            let changed=false;
            for(let i=0;i<n;i++)if(smoothed[i]<bl[i]){bl[i]=smoothed[i];changed=true;}
            if(!changed)break;
        }
        return Array.from(bl);
    }

    function iterativePolynomialBaseline(y,order,iters){
        const n=y.length;
        const xi=Array.from({length:n},(_,i)=>(i/(n-1))*2-1);
        let weights=new Float64Array(n).fill(1);
        let bl=new Array(n).fill(0);
        for(let it=0;it<iters;it++){
            bl=polyFitEval(xi,y,weights,order);
            const nw=new Float64Array(n);
            for(let i=0;i<n;i++)nw[i]=y[i]<=bl[i]?1:1e-3;
            weights=nw;
        }
        return bl;
    }

    function polyFitEval(xi,y,w,order){
        const n=y.length,m=order+1;
        const ATA=Array.from({length:m},()=>new Float64Array(m));
        const ATb=new Float64Array(m);
        for(let i=0;i<n;i++){
            const wi=w[i],phi=new Float64Array(m);
            for(let j=0;j<m;j++)phi[j]=Math.pow(xi[i],j);
            for(let j=0;j<m;j++){ATb[j]+=wi*phi[j]*y[i];for(let k=0;k<m;k++)ATA[j][k]+=wi*phi[j]*phi[k];}
        }
        for(let p=0;p<m;p++){
            let mx=p;for(let r=p+1;r<m;r++)if(Math.abs(ATA[r][p])>Math.abs(ATA[mx][p]))mx=r;
            [ATA[p],ATA[mx]]=[ATA[mx],ATA[p]];[ATb[p],ATb[mx]]=[ATb[mx],ATb[p]];
            for(let r=p+1;r<m;r++){const f=ATA[r][p]/(ATA[p][p]||1e-15);for(let c=p;c<m;c++)ATA[r][c]-=f*ATA[p][c];ATb[r]-=f*ATb[p];}
        }
        const coeffs=new Float64Array(m);
        for(let i=m-1;i>=0;i--){let s=ATb[i];for(let j=i+1;j<m;j++)s-=ATA[i][j]*coeffs[j];coeffs[i]=s/(ATA[i][i]||1e-15);}
        return xi.map(x=>coeffs.reduce((s,c,j)=>s+c*Math.pow(x,j),0));
    }

    function alsBaseline(y,lam,p,iters){
        const n=y.length;
        let w=new Float64Array(n).fill(p),z=Float64Array.from(y);
        for(let it=0;it<iters;it++){
            z=whittakerSmoother(y,w,lam);
            for(let i=0;i<n;i++)w[i]=y[i]>z[i]?p:1-p;
        }
        return Array.from(z);
    }

    function whittakerSmoother(y,w,lam){
        const n=y.length;
        const d=new Float64Array(n);
        for(let i=0;i<n;i++){const lD2=lam*(i===0||i===n-1?1:i===1||i===n-2?5:6);d[i]=w[i]+lD2;}
        let z=Float64Array.from(y);
        for(let iter=0;iter<20;iter++){
            const zN=new Float64Array(n);
            for(let i=0;i<n;i++){
                let pen=0;
                if(i>=2)pen+=lam*(z[i-2]-2*z[i-1]+z[i]);
                if(i<=n-3)pen+=lam*(z[i]-2*z[i+1]+z[i+2]);
                if(i>=1&&i<=n-2)pen-=2*lam*(z[i-1]-2*z[i]+(i+1<n?z[i+1]:0));
                zN[i]=(w[i]*y[i]-pen)/(d[i]||1);
            }
            z=zN;
        }
        return z;
    }


    // ═══════════════════════════════════════════════════════════════════════
    //  applyAxisCalibration — 2-point linear map; reads HTML IDs calXData1 etc.
    // ═══════════════════════════════════════════════════════════════════════
    window.applyAxisCalibration = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        if (!config.axisShift) config.axisShift = { xOffset:0, xScale:1, yOffset:0, yScale:1 };
        const g = id => parseFloat(document.getElementById(id)?.value);
        const xd1=g('calXData1'), xr1=g('calXReal1'), xd2=g('calXData2'), xr2=g('calXReal2');
        const yd1=g('calYData1'), yr1=g('calYReal1'), yd2=g('calYData2'), yr2=g('calYReal2');
        if (!isNaN(xd1)&&!isNaN(xr1)&&!isNaN(xd2)&&!isNaN(xr2)&&xd1!==xd2) {
            const xs=(xr2-xr1)/(xd2-xd1), xo=xr1/xs-xd1;
            config.axisShift.xScale=xs; config.axisShift.xOffset=xo;
            const oe=document.getElementById('axisShiftXOffset'); if(oe) oe.value=+xs.toPrecision(8);
            const se=document.getElementById('axisShiftXScale');  if(se) se.value=+xo.toPrecision(8);
        }
        if (!isNaN(yd1)&&!isNaN(yr1)&&!isNaN(yd2)&&!isNaN(yr2)&&yd1!==yd2) {
            const ys=(yr2-yr1)/(yd2-yd1), yo=yr1/ys-yd1;
            config.axisShift.yScale=ys; config.axisShift.yOffset=yo;
            const oe=document.getElementById('axisShiftYOffset'); if(oe) oe.value=+ys.toPrecision(8);
            const se=document.getElementById('axisShiftYScale');  if(se) se.value=+yo.toPrecision(8);
        }
        renderPlot();
        updateStatus('2-point calibration applied.');
    };
    // Legacy alias
    window.applyCalibration = window.applyAxisCalibration;

    // ═══════════════════════════════════════════════════════════════════════
    //  applyChartTypeSettings — reads chartType, yAxisAssign, errorBar* IDs
    // ═══════════════════════════════════════════════════════════════════════
    window.applyChartTypeSettings = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        const g = id => document.getElementById(id);

        // Chart type
        const ct = g('chartType')?.value || 'scatter_line';
        config.chartType = ct;
        const ho = g('histogram-opts');
        if (ho) ho.style.display = ct === 'histogram' ? 'block' : 'none';
        if (ct === 'histogram') {
            const bs = parseFloat(g('histBinSize')?.value);
            config.histBinSize = isNaN(bs) ? null : bs;
        }

        // Y axis side
        const ya = g('yAxisAssign')?.value || 'left';
        config.yaxisSide = ya;

        // Error bars — map new HTML IDs to config.errorConfig shape renderPlot uses
        const ebType = g('errorBarType')?.value || 'none';
        g('errbar-fixed-row') && (g('errbar-fixed-row').style.display = ebType==='fixed'   ? 'block' : 'none');
        g('errbar-pct-row')   && (g('errbar-pct-row').style.display   = ebType==='percent' ? 'block' : 'none');
        g('errbar-col-row')   && (g('errbar-col-row').style.display   = ebType==='column'  ? 'block' : 'none');

        // Store in both old errorConfig shape (for renderPlot) AND new errorBar shape
        const ebVal     = parseFloat(g('errorBarValue')?.value)   || 0;
        const ebPct     = parseFloat(g('errorBarPercent')?.value) || 5;
        const ebCol     = g('errorBarColumn')?.value || null;
        const ebSym     = g('errorBarSymmetric')?.checked !== false;

        // Map to errorConfig (what renderPlot reads)
        config.errorConfig = {
            show:     ebType !== 'none',
            type:     ebType === 'fixed'   ? 'constant'
                    : ebType === 'percent' ? 'percent'
                    : ebType === 'column'  ? (ebSym ? 'symmetric' : 'asymmetric')
                    : ebType === 'sqrt'    ? 'sqrt'
                    : 'none',
            col:      ebCol,
            colPlus:  ebCol,
            colMinus: ebCol,
            constant: ebVal,
            percent:  ebPct
        };
        // Also keep errorBar for reference
        config.errorBar = { type:ebType, value:ebVal, percent:ebPct, column:ebCol, symmetric:ebSym };

        // Multi-Y columns
        const myS = document.getElementById('y-multi-select');
        if (myS) config.multiYCols = Array.from(myS.selectedOptions).map(o=>o.value);
        const gbM = document.getElementById('grouped-bar-mode');
        if (gbM) config.groupedBarMeanSD = gbM.checked;

        renderPlot();
        updateStatus('Chart settings updated.');
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  renderTable — full editable data modal
    // ═══════════════════════════════════════════════════════════════════════
    function renderTable() {
        if (!state.activeFileId) return;
        const file = state.files.find(f => f.id === state.activeFileId);
        if (!file || !file.data || file.data.length === 0) {
            updateStatus('No data to show.'); return;
        }

        // Remove existing modal if any
        const existingModal = document.getElementById('dataEditModal');
        if (existingModal) existingModal.remove();

        const cols = file.columns;

        // Build modal
        const overlay = document.createElement('div');
        overlay.id = 'dataEditModal';
        overlay.style.cssText = 'position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding-top:3vh;';

        const box = document.createElement('div');
        box.style.cssText = 'background:white;border-radius:8px;padding:18px;width:92%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.25);';

        // Header row
        const hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:10px;';
        hdr.innerHTML = `
            <div>
                <h3 style="margin:0;font-size:15px;"><i class="fa-solid fa-table" style="color:#00796b;"></i> Edit Data — <span style="color:#00796b;">${file.name}</span></h3>
                <p style="margin:3px 0 0;font-size:11px;color:#888;">${file.data.length} rows · ${cols.length} columns. Click any cell to edit. Changes apply immediately.</p>
            </div>
            <div style="display:flex;gap:7px;align-items:center;">
                <button onclick="dataTableAddRow()" style="background:#00796b;color:white;border:none;border-radius:4px;padding:6px 12px;font-size:12px;cursor:pointer;width:auto;">
                    <i class="fa-solid fa-plus"></i> Add Row
                </button>
                <button onclick="dataTableExportCSV()" style="background:#3498db;color:white;border:none;border-radius:4px;padding:6px 12px;font-size:12px;cursor:pointer;width:auto;">
                    <i class="fa-solid fa-download"></i> Export CSV
                </button>
                <button onclick="document.getElementById('dataEditModal').remove()" style="background:#e74c3c;color:white;border:none;border-radius:4px;padding:6px 12px;font-size:12px;cursor:pointer;width:auto;">
                    <i class="fa-solid fa-xmark"></i> Close
                </button>
            </div>`;
        box.appendChild(hdr);

        // Table wrapper
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'overflow:auto;flex:1;border:1px solid #eee;border-radius:4px;';

        const tbl = document.createElement('table');
        tbl.id = 'dataEditTable';
        tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';

        // Head
        const thead = tbl.createTHead();
        const hr2 = thead.insertRow();
        hr2.style.background = '#f5f5f5';
        // Row number col
        const th0 = document.createElement('th');
        th0.style.cssText = 'padding:7px 8px;border:1px solid #ddd;color:#aaa;font-size:10px;width:36px;';
        th0.textContent = '#';
        hr2.appendChild(th0);
        cols.forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = 'padding:7px 8px;border:1px solid #ddd;text-align:left;white-space:nowrap;position:sticky;top:0;background:#f5f5f5;';
            th.innerHTML = `<span>${col}</span>`;
            hr2.appendChild(th);
        });
        // Delete col header
        const thDel = document.createElement('th');
        thDel.style.cssText = 'padding:7px 8px;border:1px solid #ddd;width:32px;position:sticky;top:0;background:#f5f5f5;';
        hr2.appendChild(thDel);

        // Body
        const tbody = tbl.createTBody();
        const buildRow = (rowIdx) => {
            const tr = document.createElement('tr');
            tr.dataset.rowIdx = rowIdx;
            tr.style.background = rowIdx % 2 === 0 ? '#fff' : '#fafafa';

            // Row number
            const tdN = document.createElement('td');
            tdN.style.cssText = 'padding:4px 6px;border:1px solid #eee;color:#bbb;text-align:center;font-size:10px;';
            tdN.textContent = rowIdx + 1;
            tr.appendChild(tdN);

            cols.forEach(col => {
                const td = document.createElement('td');
                td.style.cssText = 'padding:0;border:1px solid #eee;';
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.value = file.data[rowIdx][col] !== undefined ? file.data[rowIdx][col] : '';
                inp.style.cssText = 'width:100%;border:none;padding:5px 7px;background:transparent;font-size:12px;box-sizing:border-box;';
                inp.addEventListener('focus', () => { inp.style.background='#fff9c4'; td.style.border='1px solid #f39c12'; });
                inp.addEventListener('blur',  () => { inp.style.background='transparent'; td.style.border='1px solid #eee'; });
                inp.addEventListener('change', () => {
                    file.data[rowIdx][col] = inp.value;
                    renderPlot();
                });
                td.appendChild(inp);
                tr.appendChild(td);
            });

            // Delete row button
            const tdDel = document.createElement('td');
            tdDel.style.cssText = 'padding:4px 5px;border:1px solid #eee;text-align:center;';
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '✕';
            delBtn.title = 'Delete row';
            delBtn.style.cssText = 'background:#fee;color:#c0392b;border:1px solid #e9c;border-radius:3px;padding:2px 6px;font-size:11px;cursor:pointer;width:auto;';
            delBtn.onclick = () => {
                file.data.splice(rowIdx, 1);
                renderPlot();
                renderTable(); // Rebuild
            };
            tdDel.appendChild(delBtn);
            tr.appendChild(tdDel);
            return tr;
        };

        file.data.forEach((_, i) => tbody.appendChild(buildRow(i)));
        tbl.appendChild(tbody);
        tableWrap.appendChild(tbl);
        box.appendChild(tableWrap);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Helper functions on window so onclick="" works
        window.dataTableAddRow = () => {
            const newRow = {};
            cols.forEach(c => newRow[c] = '');
            file.data.push(newRow);
            const tr = buildRow(file.data.length - 1);
            tbody.appendChild(tr);
            tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            renderPlot();
        };
        window.dataTableExportCSV = () => {
            const rows = [cols.join(',')];
            file.data.forEach(r => rows.push(cols.map(c => {
                const v = String(r[c] ?? '');
                return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
            }).join(',')));
            const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = file.name.replace(/\.[^.]+$/,'') + '_edited.csv';
            a.click(); URL.revokeObjectURL(a.href);
        };

        // Close on overlay click
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        updateStatus(`Editing ${file.name} — ${file.data.length} rows`);
    }

    // Wire up openDataTable
    window.openDataTable = () => {
        const modal = document.getElementById('dataEditModal');
        if (modal) { modal.remove(); updateStatus('Table closed.'); return; }
        if (!state.activeFileId) { updateStatus('No dataset loaded.'); return; }
        renderTable();
    };



    // ═══════════════════════════════════════════════════════════════════════
    //  STATISTICS
    // ═══════════════════════════════════════════════════════════════════════
    function getColVals(fileId, colName) {
        const file = state.files.find(f=>f.id===fileId);
        if (!file) return [];
        return file.data.map(r=>parseVal(r[colName])).filter(v=>!isNaN(v));
    }

    function descStats(vals) {
        if (!vals.length) return null;
        const n = vals.length;
        const sorted = [...vals].sort((a,b)=>a-b);
        const mean = vals.reduce((a,b)=>a+b,0)/n;
        const variance = vals.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/(n-1||1);
        const sd = Math.sqrt(variance);
        const sem = sd/Math.sqrt(n);
        const median = n%2===0 ? (sorted[n/2-1]+sorted[n/2])/2 : sorted[Math.floor(n/2)];
        const q1 = sorted[Math.floor(n/4)];
        const q3 = sorted[Math.floor(3*n/4)];
        const cv = mean!==0 ? (sd/Math.abs(mean))*100 : NaN;
        return {n, mean, sd, sem, median, q1, q3, min:sorted[0], max:sorted[n-1], cv};
    }

    window.runDescriptiveStats = () => {
        if (!state.activeFileId) return;
        const col = document.getElementById('stats-col-select')?.value;
        if (!col) return;
        const vals = getColVals(state.activeFileId, col);
        const s = descStats(vals);
        if (!s) { alert('No numeric data in column'); return; }
        const fmt = v => isNaN(v) ? 'N/A' : v.toPrecision(5);
        const box = document.getElementById('desc-stats-box');
        box.style.display = 'block';
        box.innerHTML = [
            `<b>Column:</b> ${col}`,
            `N = ${s.n}`,
            `Mean = ${fmt(s.mean)}`,
            `SD = ${fmt(s.sd)}`,
            `SEM = ${fmt(s.sem)}`,
            `Median = ${fmt(s.median)}`,
            `Q1 = ${fmt(s.q1)}  Q3 = ${fmt(s.q3)}`,
            `Min = ${fmt(s.min)}  Max = ${fmt(s.max)}`,
            `CV% = ${fmt(s.cv)}`
        ].join('<br>');
    };

    window.runColumnSummary = () => {
        if (!state.activeFileId) return;
        const file = state.files.find(f=>f.id===state.activeFileId);
        if (!file) return;
        const numCols = file.columns.filter(c => {
            const v = getColVals(state.activeFileId, c);
            return v.length > 0;
        });
        let tbl = `<table style="border-collapse:collapse;width:100%;font-size:11px;">
            <thead><tr style="background:#f5f5f5;">
                <th style="padding:4px 6px;border:1px solid #ddd;text-align:left;">Column</th>
                <th style="padding:4px 6px;border:1px solid #ddd;">N</th>
                <th style="padding:4px 6px;border:1px solid #ddd;">Mean</th>
                <th style="padding:4px 6px;border:1px solid #ddd;">SD</th>
                <th style="padding:4px 6px;border:1px solid #ddd;">SEM</th>
                <th style="padding:4px 6px;border:1px solid #ddd;">Min</th>
                <th style="padding:4px 6px;border:1px solid #ddd;">Max</th>
            </tr></thead><tbody>`;
        numCols.forEach(c => {
            const s = descStats(getColVals(state.activeFileId, c));
            if (!s) return;
            const f = v=>isNaN(v)?'—':v.toPrecision(4);
            tbl += `<tr>
                <td style="padding:4px 6px;border:1px solid #eee;font-weight:600;">${c}</td>
                <td style="padding:4px 6px;border:1px solid #eee;text-align:center;">${s.n}</td>
                <td style="padding:4px 6px;border:1px solid #eee;text-align:center;">${f(s.mean)}</td>
                <td style="padding:4px 6px;border:1px solid #eee;text-align:center;">${f(s.sd)}</td>
                <td style="padding:4px 6px;border:1px solid #eee;text-align:center;">${f(s.sem)}</td>
                <td style="padding:4px 6px;border:1px solid #eee;text-align:center;">${f(s.min)}</td>
                <td style="padding:4px 6px;border:1px solid #eee;text-align:center;">${f(s.max)}</td>
            </tr>`;
        });
        tbl += '</tbody></table>';
        const box = document.getElementById('col-summary-box');
        box.style.display = 'block';
        box.innerHTML = tbl;
    };

    window.runStatTest = () => {
        if (!state.activeFileId) return;
        const testType = document.getElementById('stats-test-type')?.value;
        const colA = document.getElementById('test-colA')?.value;
        const colB = document.getElementById('test-colB')?.value;
        const vA = getColVals(state.activeFileId, colA);
        const vB = getColVals(state.activeFileId, colB);
        if (!vA.length || !vB.length) { alert('Not enough data.'); return; }

        let result = '';

        if (testType === 'anova1') {
            // One-way ANOVA across all numeric columns
            const file = state.files.find(f=>f.id===state.activeFileId);
            const groups = file.columns
                .map(c=>({name:c,vals:getColVals(state.activeFileId,c)}))
                .filter(g=>g.vals.length>1);
            const k = groups.length, N = groups.reduce((s,g)=>s+g.vals.length,0);
            const grandMean = groups.flatMap(g=>g.vals).reduce((a,b)=>a+b,0)/N;
            const ssBetween = groups.reduce((s,g)=>{
                const gm=g.vals.reduce((a,b)=>a+b,0)/g.vals.length;
                return s+g.vals.length*(gm-grandMean)**2;
            },0);
            const ssWithin = groups.reduce((s,g)=>{
                const gm=g.vals.reduce((a,b)=>a+b,0)/g.vals.length;
                return s+g.vals.reduce((ss,v)=>ss+(v-gm)**2,0);
            },0);
            const dfB=k-1, dfW=N-k;
            const msB=ssBetween/dfB, msW=ssWithin/dfW;
            const F=msB/(msW||1e-15);
            const pApprox = fDistPValue(F,dfB,dfW);
            result = `<b>One-Way ANOVA</b><br>Groups (k): ${k}<br>N total: ${N}<br>` +
                `F(${dfB},${dfW}) = ${F.toFixed(4)}<br>` +
                `SS between = ${ssBetween.toPrecision(5)}<br>` +
                `SS within = ${ssWithin.toPrecision(5)}<br>` +
                `<b>p ≈ ${pApprox < 0.001 ? '<0.001' : pApprox.toFixed(4)}</b><br>` +
                sigStars(pApprox);
        } else if (testType === 'mannwhitney') {
            const {U,p} = mannWhitneyU(vA, vB);
            result = `<b>Mann-Whitney U test</b><br>` +
                `${colA} (n=${vA.length})  vs  ${colB} (n=${vB.length})<br>` +
                `U = ${U.toFixed(1)}<br><b>p ≈ ${p<0.001?'<0.001':p.toFixed(4)}</b><br>` + sigStars(p);
        } else {
            // t-tests
            const sA=descStats(vA), sB=descStats(vB);
            let t, df, p;
            if (testType==='ttest_paired') {
                const n=Math.min(vA.length,vB.length);
                const diffs=Array.from({length:n},(_,i)=>vA[i]-vB[i]);
                const md=diffs.reduce((a,b)=>a+b,0)/n;
                const sdD=Math.sqrt(diffs.map(d=>(d-md)**2).reduce((a,b)=>a+b,0)/(n-1||1));
                t=md/(sdD/Math.sqrt(n)||1e-15); df=n-1;
            } else if (testType==='welch') {
                const s2A=sA.sd**2/sA.n, s2B=sB.sd**2/sB.n;
                t=(sA.mean-sB.mean)/Math.sqrt(s2A+s2B||1e-15);
                df=(s2A+s2B)**2/((s2A**2/(sA.n-1))+(s2B**2/(sB.n-1)));
            } else { // unpaired
                const sp=Math.sqrt(((sA.n-1)*sA.sd**2+(sB.n-1)*sB.sd**2)/(sA.n+sB.n-2));
                t=(sA.mean-sB.mean)/(sp*Math.sqrt(1/sA.n+1/sB.n)||1e-15);
                df=sA.n+sB.n-2;
            }
            p = tDistPValue(Math.abs(t), df) * 2; // two-tailed
            const lbl = {ttest_unpaired:'Unpaired t-test',ttest_paired:'Paired t-test',welch:"Welch's t-test"}[testType];
            result = `<b>${lbl}</b><br>` +
                `${colA}: mean=${sA.mean.toPrecision(5)}, SD=${sA.sd.toPrecision(4)}, n=${sA.n}<br>` +
                `${colB}: mean=${sB.mean.toPrecision(5)}, SD=${sB.sd.toPrecision(4)}, n=${sB.n}<br>` +
                `t(${df.toFixed(1)}) = ${t.toFixed(4)}<br>` +
                `<b>p = ${p<0.0001?'<0.0001':p.toFixed(4)}</b><br>` + sigStars(p) +
                `<br>Mean diff = ${(sA.mean-sB.mean).toPrecision(5)}<br>` +
                `95% CI ≈ [${((sA.mean-sB.mean)-1.96*Math.sqrt((sA.sd**2/sA.n+sB.sd**2/sB.n))).toPrecision(4)}, ` +
                `${((sA.mean-sB.mean)+1.96*Math.sqrt((sA.sd**2/sA.n+sB.sd**2/sB.n))).toPrecision(4)}]`;
        }

        const box = document.getElementById('test-results-box');
        box.style.display = 'block';
        box.innerHTML = result;
    };

    function sigStars(p) {
        if (p<0.0001) return '<span style="color:#d32f2f;font-weight:bold;">**** (p<0.0001)</span>';
        if (p<0.001)  return '<span style="color:#d32f2f;font-weight:bold;">*** (p<0.001)</span>';
        if (p<0.01)   return '<span style="color:#e65100;font-weight:bold;">** (p<0.01)</span>';
        if (p<0.05)   return '<span style="color:#f9a825;font-weight:bold;">* (p<0.05)</span>';
        return '<span style="color:#388e3c;">ns (p≥0.05)</span>';
    }

    // Approximations for p-values
    function tDistPValue(t, df) {
        // Two-tailed: beta incomplete function approximation
        const x = df/(df+t*t);
        return regularizedIncompleteBeta(df/2, 0.5, x);
    }
    function fDistPValue(F, df1, df2) {
        const x = df2/(df2+df1*F);
        return regularizedIncompleteBeta(df2/2, df1/2, x);
    }
    function regularizedIncompleteBeta(a, b, x) {
        // Continued fraction approximation (Lentz method)
        if (x<0||x>1) return NaN;
        if (x===0) return 0; if (x===1) return 1;
        const lbeta = lgamma(a)+lgamma(b)-lgamma(a+b);
        const front = Math.exp(Math.log(x)*a+Math.log(1-x)*b-lbeta)/a;
        // Evaluate continued fraction
        let cf=1, lastcf=0, d, m=0;
        for (let i=0;i<200&&Math.abs(cf-lastcf)>1e-9;i++) {
            lastcf=cf; m++;
            const m2=2*m;
            const aa= m*(b-m)*x/((a+m2-1)*(a+m2));
            cf=1+aa/(1+aa); // simplified; full Lentz not needed for approximation
            const bb=-(a+m)*(a+b+m)*x/((a+m2)*(a+m2+1));
            cf+=bb;
        }
        return Math.min(1,front*cf);
    }
    function lgamma(z) {
        // Stirling approximation
        if(z<0.5) return Math.log(Math.PI/Math.sin(Math.PI*z))-lgamma(1-z);
        z--;
        const c=[76.18009172947146,-86.50532032941677,24.01409824083091,
            -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
        let x=0.99999999999999987, tmp=z+5.5;
        c.forEach((ci,i)=>x+=ci/(z+i+1));
        return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(tmp)-tmp+Math.log(x);
    }
    function mannWhitneyU(a, b) {
        let U1=0;
        a.forEach(ai=>b.forEach(bi=>{ if(ai>bi)U1++; else if(ai===bi)U1+=0.5; }));
        const U2=a.length*b.length-U1;
        const U=Math.min(U1,U2);
        const n1=a.length,n2=b.length;
        const mu=n1*n2/2;
        const sigma=Math.sqrt(n1*n2*(n1+n2+1)/12);
        const z=(U-mu)/(sigma||1);
        const p=2*(1-normalCDF(Math.abs(z)));
        return {U,p};
    }
    function normalCDF(z) {
        // Abramowitz & Stegun
        const t=1/(1+0.2316419*Math.abs(z));
        const d=0.3989423*Math.exp(-z*z/2);
        const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
        return z>0 ? 1-p : p;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PLOT APPEARANCE
    // ═══════════════════════════════════════════════════════════════════════
    const plotAppearance = {
        bgColor: '#fcfcfc', paperColor: '#ffffff',
        fontSize: 12, fontFamily: 'Arial',
        showGridX: true, showGridY: true, showLegend: true,
        zeroLine: true, height: 580
    };

    window.applyPlotAppearance = () => {
        const g = id => document.getElementById(id);
        plotAppearance.bgColor     = g('plotBgColor')?.value      || '#fcfcfc';
        plotAppearance.paperColor  = g('plotPaperColor')?.value   || '#ffffff';
        plotAppearance.fontSize    = parseInt(g('plotFontSize')?.value) || 12;
        plotAppearance.fontFamily  = g('plotFont')?.value         || 'Arial';
        plotAppearance.showGridX   = g('showGridX')?.checked !== false;
        plotAppearance.showGridY   = g('showGridY')?.checked !== false;
        plotAppearance.showLegend  = g('showLegend')?.checked !== false;
        plotAppearance.zeroLine    = g('plotZeroLine')?.checked !== false;
        plotAppearance.height      = parseInt(g('plotHeight')?.value) || 580;
        renderPlot();
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  EXPORT HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    window.exportActiveCSV = () => {
        if (!state.activeFileId) return;
        const file = state.files.find(f=>f.id===state.activeFileId);
        if (!file) return;
        const rows = [file.columns.join(',')];
        file.data.forEach(r => rows.push(file.columns.map(c => {
            const v = String(r[c]??'');
            return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
        }).join(',')));
        const blob = new Blob([rows.join('\n')], {type:'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name.replace(/\.[^.]+$/,'') + '_export.csv';
        a.click(); URL.revokeObjectURL(a.href);
    };

    window.exportSVG = () => {
        Plotly.downloadImage('plotly-div', {format:'svg', filename:'plot'});
    };

});