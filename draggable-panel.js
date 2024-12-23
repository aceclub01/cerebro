// draggable-panel.js
const sidePanel = document.getElementById("sidePanel");
const sidePanelHeader = document.getElementById("sidePanelHeader");
let isDragging = false;
let offsetX = 0, offsetY = 0;

// Start dragging when mousedown or touchstart is detected on the header
sidePanelHeader.addEventListener("mousedown", startDrag);
sidePanelHeader.addEventListener("touchstart", startDrag, { passive: false });

function startDrag(e) {
    isDragging = true;
    const event = e.touches ? e.touches[0] : e; // Handle both mouse and touch events
    offsetX = event.clientX - sidePanel.offsetLeft;
    offsetY = event.clientY - sidePanel.offsetTop;

    // Attach event listeners to the document to track dragging
    document.addEventListener("mousemove", dragPanel);
    document.addEventListener("touchmove", dragPanel, { passive: false });
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchend", stopDrag);
}

function dragPanel(e) {
    if (!isDragging) return;

    const event = e.touches ? e.touches[0] : e;
    const newLeft = event.clientX - offsetX;
    const newTop = event.clientY - offsetY;

    // Update the panel's position
    sidePanel.style.left = `${newLeft}px`;
    sidePanel.style.top = `${newTop}px`;
}

function stopDrag() {
    isDragging = false;

    // Remove the event listeners when dragging stops
    document.removeEventListener("mousemove", dragPanel);
    document.removeEventListener("touchmove", dragPanel);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchend", stopDrag);
}
