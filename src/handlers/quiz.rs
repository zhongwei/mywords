use axum::extract::{Path, State};
use axum::Json;
use std::collections::HashMap;
use std::sync::Mutex;
use crate::db::Db;
use crate::error::AppError;
use crate::models::*;
use crate::services;

lazy_static::lazy_static! {
    static ref QUIZ_STORE: Mutex<HashMap<i64, Quiz>> = Mutex::new(HashMap::new());
}

pub async fn generate_quiz(
    State(db): State<Db>,
    Json(req): Json<GenerateQuizRequest>,
) -> Result<Json<Quiz>, AppError> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let quiz = services::quiz::generate_quiz(&conn, &req)?;
    QUIZ_STORE.lock().unwrap().insert(quiz.id, quiz.clone());
    Ok(Json(quiz))
}

pub async fn submit_quiz(
    State(db): State<Db>,
    Path(id): Path<i64>,
    Json(req): Json<SubmitQuizRequest>,
) -> Result<Json<QuizResult>, AppError> {
    let quiz = QUIZ_STORE.lock().unwrap().get(&id).cloned()
        .ok_or_else(|| AppError::NotFound(format!("Quiz {} not found", id)))?;
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let result = services::quiz::submit_quiz(&conn, &quiz, &req)?;
    Ok(Json(result))
}
