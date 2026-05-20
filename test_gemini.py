# To run this code you need to install the following dependencies:
# pip install google-genai

import os
from google import genai
from google.genai import types


def generate():
    client = genai.Client(
        api_key=os.environ.get("AIzaSyCdcbvsoPRqXZ5-UWx-xAAcoMktBhg_7CY"),
    )

    model = "gemini-3.5-flash"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="""INSERT_INPUT_HERE"""),
            ],
        ),
    ]
    tools = [
        types.Tool(url_context=types.UrlContext()),
        types.Tool(code_execution=types.ToolCodeExecution),
        types.Tool(googleSearch=types.GoogleSearch(
        )),
    ]
    generate_content_config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="HIGH",
        ),
        media_resolution="MEDIA_RESOLUTION_HIGH",
        safety_settings=[
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT",
                threshold="BLOCK_MEDIUM_AND_ABOVE",  # Block some
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH",
                threshold="BLOCK_MEDIUM_AND_ABOVE",  # Block some
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold="BLOCK_MEDIUM_AND_ABOVE",  # Block some
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold="BLOCK_MEDIUM_AND_ABOVE",  # Block some
            ),
        ],
        tools=tools,
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if (
            chunk.parts is None
        ):
            continue
        if chunk.parts[0].text:
            print(chunk.parts[0].text, end="")
        if chunk.parts[0].executable_code:
            print(chunk.parts[0].executable_code)
        if chunk.parts[0].code_execution_result:
            print(chunk.parts[0].code_execution_result)

if __name__ == "__main__":
    generate()