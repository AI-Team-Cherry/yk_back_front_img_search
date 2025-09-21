import { useMemo, useState } from "react";

const API = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

export default function PhotoSearch() {
    const [queryFile, setQueryFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [category, setCategory] = useState<any[]>([]);

    const [itemId, setItemId] = useState("");
    const [catalogFile, setCatalogFile] = useState<File | null>(null);
    const [brand, setBrand] = useState("");
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [url, setUrl] = useState("");
    const [adminMsg, setAdminMsg] = useState<string | null>(null);

    const preview = useMemo(
        () => (queryFile ? URL.createObjectURL(queryFile) : null),
        [queryFile]
    );

    const onSearch = async () => {
        if (!queryFile) return setError("이미지를 선택하세요.");
        setLoading(true);
        setError(null);
        setResults([]);
        setCategory([]);
        try {
            const fd = new FormData();
            fd.append("file", queryFile);
            const res = await fetch(`${API}/search?topk=12`, {
                method: "POST",
                body: fd,
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json?.msg || "검색 실패");
            setResults(json.results);
            if (json.predicted_categories)
                setCategory(json.predicted_categories);
        } catch (e: any) {
            setError(e?.message || "네트워크 오류");
        } finally {
            setLoading(false);
        }
    };

    const saveCatalogAndMeta = async () => {
        if (!itemId || !catalogFile)
            return setAdminMsg("item_id와 이미지 파일을 입력하세요.");
        setAdminMsg(null);

        // 1단계: 이미지 등록
        const fd = new FormData();
        fd.append("file", catalogFile);
        const res1 = await fetch(
            `${API}/catalog/add?item_id=${encodeURIComponent(itemId)}`,
            {
                method: "POST",
                body: fd,
            }
        );
        const json1 = await res1.json();

        // 2단계: 메타 정보 등록
        const params = new URLSearchParams({ item_id: itemId });
        if (brand) params.append("brand", brand);
        if (title) params.append("title", title);
        if (price) params.append("price", price);
        if (url) params.append("url", url);
        const res2 = await fetch(`${API}/meta/upsert?${params.toString()}`, {
            method: "POST",
        });
        const json2 = await res2.json();

        setAdminMsg(JSON.stringify({ ...json1, meta: json2.meta }, null, 2));
    };

    const deleteItem = async () => {
        if (!itemId) return setAdminMsg("삭제할 item_id를 입력하세요.");
        try {
            const res = await fetch(`${API}/catalog/delete?item_id=${itemId}`, {
                method: "DELETE",
            });
            const json = await res.json();
            setAdminMsg(JSON.stringify(json, null, 2));
        } catch (e: any) {
            setAdminMsg("삭제 실패: " + (e?.message || "오류"));
        }
    };

    return (
        <div
            style={{
                maxWidth: 800,
                margin: "0 auto",
                padding: 24,
                fontFamily: "sans-serif",
            }}
        >
            <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
                이미지로 옷 찾기
            </h1>

            {/* 검색 섹션 */}
            <section
                style={{
                    border: "1px solid #ccc",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 30,
                }}
            >
                <h2
                    style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        marginBottom: 12,
                    }}
                >
                    1. 이미지 검색
                </h2>
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 12,
                    }}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setQueryFile(e.target.files?.[0] || null)
                        }
                    />
                    <button
                        onClick={onSearch}
                        disabled={loading}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#333",
                            color: "#fff",
                            borderRadius: 4,
                        }}
                    >
                        {loading ? "검색 중..." : "검색"}
                    </button>
                </div>
                {preview && (
                    <div style={{ marginBottom: 12 }}>
                        <img
                            src={preview}
                            alt="preview"
                            style={{
                                height: 160,
                                border: "1px solid #ddd",
                                borderRadius: 4,
                            }}
                        />
                    </div>
                )}
                {error && (
                    <div style={{ color: "red", marginBottom: 12 }}>
                        {error}
                    </div>
                )}
                {category.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <strong>예측 카테고리:</strong>
                        <ul style={{ paddingLeft: 20 }}>
                            {category.map((c, idx) => (
                                <li key={idx}>
                                    {c.label} ({(c.score * 100).toFixed(1)}%)
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {results.length > 0 && (
                    <div>
                        <h3 style={{ fontWeight: "bold", marginBottom: 8 }}>
                            검색 결과:
                        </h3>
                        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                            {results.map((r) => (
                                <li
                                    key={r.id}
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: 10,
                                        marginBottom: 8,
                                        borderRadius: 4,
                                    }}
                                >
                                    {r.image_url && (
                                        <img
                                            src={`${API}${r.image_url}`}
                                            alt="상품 이미지"
                                            style={{
                                                height: 80,
                                                marginBottom: 8,
                                            }}
                                        />
                                    )}
                                    <div style={{ fontWeight: "bold" }}>
                                        {r.title || r.id}
                                    </div>
                                    <div>{r.brand}</div>
                                    {r.price && (
                                        <div>{r.price.toLocaleString()}원</div>
                                    )}
                                    {r.score && (
                                        <div>
                                            유사도: {(r.score * 100).toFixed(1)}
                                            %
                                        </div>
                                    )}
                                    {r.url && (
                                        <a
                                            href={r.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: "#007bff" }}
                                        >
                                            상품 보기
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {/* 등록 & 삭제 섹션 */}
            <section
                style={{
                    border: "1px solid #ccc",
                    padding: 16,
                    borderRadius: 8,
                }}
            >
                <h2
                    style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        marginBottom: 12,
                    }}
                >
                    2. 상품 등록 / 삭제
                </h2>
                <input
                    placeholder="item_id"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    style={{
                        width: "100%",
                        marginBottom: 8,
                        padding: 8,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                    }}
                />
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                    }}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setCatalogFile(e.target.files?.[0] || null)
                        }
                    />
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                    }}
                >
                    <input
                        placeholder="brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        style={inputStyle}
                    />
                    <input
                        placeholder="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={inputStyle}
                    />
                    <input
                        placeholder="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        style={inputStyle}
                    />
                    <input
                        placeholder="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                        onClick={saveCatalogAndMeta}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#0066cc",
                            color: "white",
                            borderRadius: 4,
                        }}
                    >
                        저장
                    </button>
                    <button
                        onClick={deleteItem}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#cc0000",
                            color: "white",
                            borderRadius: 4,
                        }}
                    >
                        삭제
                    </button>
                </div>
                {adminMsg && (
                    <pre
                        style={{
                            backgroundColor: "#f5f5f5",
                            padding: 12,
                            borderRadius: 4,
                            marginTop: 12,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {adminMsg}
                    </pre>
                )}
            </section>
        </div>
    );
}

const inputStyle = {
    padding: 8,
    borderRadius: 4,
    border: "1px solid #ccc",
};
