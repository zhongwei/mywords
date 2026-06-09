use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use crate::db::Db;
use crate::error::AppError;
use crate::models::*;
use crate::services;

#[derive(Deserialize)]
pub struct NextQuery {
    pub limit: Option<u32>,
}

pub async fn get_next_review(
    State(db): State<Db>,
    Query(query): Query<NextQuery>,
) -> Result<Json<Vec<WordDetail>>, AppError> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let words = services::review::get_next_review(&conn, query.limit.unwrap_or(1))?;
    Ok(Json(words))
}

pub async fn submit_review(
    State(db): State<Db>,
    Path(word_id): Path<i64>,
    Json(req): Json<ReviewAnswerRequest>,
) -> Result<Json<LearningStatus>, AppError> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let status = services::review::submit_review(&conn, word_id, req.quality)?;
    Ok(Json(status))
}
