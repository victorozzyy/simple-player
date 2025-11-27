async function parseFromUrl() {
    const url = document.getElementById("url").value.trim();
    if (!url) return alert("Digite uma URL");

    const response = await fetch(url);
    const text = await response.text();

    const result = parseM3U(text);

    downloadJSON(result, "playlist_compacta.json");
}

document.getElementById('fileInput').onchange = function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function () {
        const text = reader.result;
        const result = parseM3U(text);
        downloadJSON(result, "playlist_compacta.json");
    };

    reader.readAsText(file);
};

function parseM3U(content) {
    const lines = content.split(/\r?\n/);

    const channels = [];
    let name = "";
    let group = "Outros";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("#EXTINF")) {
            const idx = line.lastIndexOf(",");
            name = line.substring(idx + 1).trim();

            const g = line.match(/group-title="([^"]+)"/i);
            if (g) group = g[1];
        }

        if (line.startsWith("http")) {
            channels.push({ name, url: line, group });
            name = "";
            group = "Outros";
        }
    }

    return { total: channels.length, channels };
}

function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}
