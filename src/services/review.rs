use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::*;

pub fn get_next_review(conn: &Connection, limit: u32) -> Result<Vec<WordDetail>, AppError> {
    let now = time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Iso8601::DEFAULT).map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = conn.prepare(
        "SELECT w.id FROM words w JOIN learning_status ls ON w.id = ls.word_id WHERE ls.next_review_at <= ?1 OR ls.next_review_at IS NULL ORDER BY ls.next_review_at ASC NULLS FIRST LIMIT ?2"
    )?;
    let word_ids: Vec<i64> = stmt.query_map(params![now, limit], |row| row.get(0))?.collect::<Result<Vec<_>, _>>()?;

    let mut results = Vec::new();
    for wid in word_ids {
        results.push(super::words::get_word(conn, wid)?);
    }
    Ok(results)
}

pub fn submit_review(conn: &Connection, word_id: i64, quality: u32) -> Result<LearningStatus, AppError> {
    if quality > 5 {
        return Err(AppError::BadRequest("quality must be 0-5".into()));
    }

    let status = conn.query_row(
        "SELECT id, word_id, status, review_count, correct_count, last_reviewed_at, next_review_at, ease_factor, interval_days FROM learning_status WHERE word_id = ?1",
        params![word_id],
        |row| Ok(LearningStatus {
            id: row.get(0)?,
            word_id: row.get(1)?,
            status: row.get(2)?,
            review_count: row.get(3)?,
            correct_count: row.get(4)?,
            last_reviewed_at: row.get(5)?,
            next_review_at: row.get(6)?,
            ease_factor: row.get(7)?,
            interval_days: row.get(8)?,
        }),
    ).map_err(|_| AppError::NotFound(format!("Learning status not found for word {}", word_id)))?;

    let new_review_count = status.review_count + 1;
    let new_correct_count = status.correct_count + if quality >= 3 { 1 } else { 0 };

    let new_ease_factor = if quality >= 3 {
        let ef = status.ease_factor + (0.1 - (5.0 - quality as f64) * 0.08);
        ef.max(1.3)
    } else {
        status.ease_factor
    };

    let new_interval = if quality < 3 {
        1
    } else if status.review_count == 0 {
        1
    } else {
        (status.interval_days as f64 * new_ease_factor).ceil() as i32
    };

    let now = time::OffsetDateTime::now_utc();
    let now_str = now.format(&time::format_description::well_known::Iso8601::DEFAULT).map_err(|e| AppError::Internal(e.to_string()))?;
    let next = now + time::Duration::days(new_interval as i64);
    let next_str = next.format(&time::format_description::well_known::Iso8601::DEFAULT).map_err(|e| AppError::Internal(e.to_string()))?;

    let new_status = if new_correct_count >= 5 && new_ease_factor >= 2.0 { "mastered" } else if new_review_count >= 1 { "review" } else { "learning" };

    conn.execute(
        "UPDATE learning_status SET status = ?1, review_count = ?2, correct_count = ?3, last_reviewed_at = ?4, next_review_at = ?5, ease_factor = ?6, interval_days = ?7 WHERE word_id = ?8",
        params![new_status, new_review_count, new_correct_count, now_str, next_str, new_ease_factor, new_interval, word_id],
    )?;

    conn.query_row(
        "SELECT id, word_id, status, review_count, correct_count, last_reviewed_at, next_review_at, ease_factor, interval_days FROM learning_status WHERE word_id = ?1",
        params![word_id],
        |row| Ok(LearningStatus {
            id: row.get(0)?,
            word_id: row.get(1)?,
            status: row.get(2)?,
            review_count: row.get(3)?,
            correct_count: row.get(4)?,
            last_reviewed_at: row.get(5)?,
            next_review_at: row.get(6)?,
            ease_factor: row.get(7)?,
            interval_days: row.get(8)?,
        }),
    ).map_err(Into::into)
}
