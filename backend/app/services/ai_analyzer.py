"""
AI service to analyze pipeline errors and provide reasons and resolutions.
Uses Google Gemini API.
"""

from __future__ import annotations

import os
from typing import Optional
import google.generativeai as genai


def analyze_pipeline_error(
    error_logs: str, tech_stack: dict, language: Optional[str] = None
) -> dict[str, str]:
    """
    Use AI (Google Gemini) to analyze a pipeline error and provide reason and resolution.
    
    Args:
        error_logs: Error logs from the failed pipeline
        tech_stack: Detected technology stack (language, framework, buildTool, etc.)
        language: Primary programming language (for context)
    
    Returns:
        Dictionary with 'reason' and 'resolution' keys
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        # Fallback: return generic response if AI is not configured
        return {
            "reason": "AI analysis not configured. Set GEMINI_API_KEY environment variable.",
            "resolution": "Please check the error logs manually and review the pipeline configuration.",
        }
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Get model name from env or use default
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Build context about the tech stack
    tech_context = f"""
Technology Stack:
- Language: {tech_stack.get('language', 'unknown')}
- Framework: {tech_stack.get('framework', 'none')}
- Build Tool: {tech_stack.get('buildTool', 'unknown')}
- Has Dockerfile: {tech_stack.get('hasDockerfile', False)}
- Has Helm: {tech_stack.get('hasHelm', False)}
- Has Terraform: {tech_stack.get('hasTerraform', False)}
"""
    
    # Truncate error logs if too long (Gemini has token limits)
    max_error_length = 8000  # Gemini can handle more tokens than OpenAI
    if len(error_logs) > max_error_length:
        error_logs = error_logs[-max_error_length:]
    
    prompt = f"""You are a DevOps expert analyzing a CI/CD pipeline failure. 

{tech_context}

Error Logs:
```
{error_logs}
```

Please provide:
1. A clear, concise reason for why the pipeline failed (2-3 sentences)
2. A step-by-step resolution to fix the issue (3-5 steps)

Format your response as:
REASON: [your reason here]
RESOLUTION: [your resolution steps here]
"""
    
    try:
        # Initialize the model
        model = genai.GenerativeModel(model_name)
        
        # Generate content
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,  # Lower temperature for more focused responses
                "max_output_tokens": 1000,
            },
        )
        
        content = response.text
        
        # Parse the response
        reason = "Unable to parse AI response"
        resolution = "Please review the error logs manually."
        
        if "REASON:" in content and "RESOLUTION:" in content:
            parts = content.split("RESOLUTION:")
            reason = parts[0].replace("REASON:", "").strip()
            resolution = parts[1].strip()
        elif "REASON:" in content:
            reason = content.split("REASON:")[1].strip()
        else:
            # Fallback: use the full response
            reason = content[:200]
            resolution = content[200:] if len(content) > 200 else "See reason above."
        
        return {"reason": reason, "resolution": resolution}
    
    except Exception as e:
        # Fallback on AI errors
        return {
            "reason": f"AI analysis failed: {str(e)}",
            "resolution": "Please review the error logs manually. Common issues include: dependency installation failures, test failures, configuration errors, or infrastructure provisioning issues.",
        }
