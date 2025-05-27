// Establish connection with content script
chrome.runtime.onConnect.addListener(function(port) {
    console.log('Background script connected');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    if (request.action === 'getAnswer') {
        getAnswerFromGemini(request.text)
            .then(answer => {
                console.log('Gemini API response:', answer);
                sendResponse({ answer });
            })
            .catch(error => {
                console.error('Gemini API error:', error);
                sendResponse({ error: error.message });
            });
        return true; // Required for async response
    }
});

// Function to get answer from Gemini
async function getAnswerFromGemini(question) {
    try {
        console.log('Sending request to Gemini API:', question);
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDTGoZMIHc3hqdRWe-_0jteh7aixJNK0y8', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `You are a helpful assistant that provides clear and concise answers to questions. Please answer the following question: ${question}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 150,
                    topP: 0.8,
                    topK: 40
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        console.log('Gemini API response status:', response.status);
        const responseText = await response.text();
        console.log('Gemini API raw response:', responseText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error Response:', errorData);
            throw new Error(errorData.error?.message || 'Failed to get answer from Gemini');
        }

        const data = await response.json();
        console.log('Gemini API Success Response:', data);
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format from Gemini');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to get answer. Please try again.');
    }
} 