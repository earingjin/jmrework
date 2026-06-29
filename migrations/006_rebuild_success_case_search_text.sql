UPDATE success_cases
SET
  search_text = concat_ws(
    ' ',
    current_job,
    previous_career,
    cert_training,
    preparation,
    activities,
    transition_type,
    recommended_target,
    keywords,
    success_factors,
    source_text
  ),
  updated_at = now();
