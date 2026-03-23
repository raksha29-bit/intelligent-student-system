def get_recommendations(query: str) -> list:
    """
    Stub for text embedding and Qdrant pipeline for resource recommendations.
    """
    print(f"Fetching recommendations for query: {query}")
    return [
        {"title": "Advanced Mathematics for GATE", "type": "pdf", "relevance": 0.95},
        {"title": "Video Lecture: Neural Networks", "type": "video", "relevance": 0.88}
    ]
