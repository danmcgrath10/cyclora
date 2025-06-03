interface QueuedSummaryRequest {
  rideId: string;
  rideData: {
    distance: number;
    duration: number;
    averageSpeed: number;
  };
  timestamp: string;
}

class AISummaryService {
  private apiKey: string | null = null;
  private queuedRequests: QueuedSummaryRequest[] = [];
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  /**
   * Set OpenAI API key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Generate AI summary for a ride
   */
  async generateSummary(rideData: {
    distance: number;
    duration: number;
    averageSpeed: number;
  }): Promise<string> {
    // If no API key is set, return a mock summary
    if (!this.apiKey) {
      return this.generateMockSummary(rideData);
    }

    try {
      const prompt = this.buildPrompt(rideData);
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an encouraging cycling coach. Generate brief, positive summaries of cycling rides in 60 words or less. Focus on achievements and encouragement.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated');
      }

      return summary;
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      // Fall back to mock summary
      return this.generateMockSummary(rideData);
    }
  }

  /**
   * Generate summary and queue if offline
   */
  async generateSummaryWithQueue(
    rideId: string,
    rideData: {
      distance: number;
      duration: number;
      averageSpeed: number;
    }
  ): Promise<string> {
    try {
      // Check if online
      const isOnline = await this.checkConnectivity();
      
      if (isOnline) {
        const summary = await this.generateSummary(rideData);
        return summary;
      } else {
        // Queue for later processing
        this.queueSummaryRequest(rideId, rideData);
        return this.generateMockSummary(rideData);
      }
    } catch (error) {
      // Queue for retry
      this.queueSummaryRequest(rideId, rideData);
      return this.generateMockSummary(rideData);
    }
  }

  /**
   * Process queued summary requests
   */
  async processQueuedRequests(
    onSummaryGenerated: (rideId: string, summary: string) => void
  ): Promise<void> {
    if (this.queuedRequests.length === 0) {
      return;
    }

    const isOnline = await this.checkConnectivity();
    if (!isOnline) {
      return;
    }

    const requestsToProcess = [...this.queuedRequests];
    this.queuedRequests = [];

    for (const request of requestsToProcess) {
      try {
        const summary = await this.generateSummary(request.rideData);
        onSummaryGenerated(request.rideId, summary);
      } catch (error) {
        console.error(`Failed to process queued summary for ride ${request.rideId}:`, error);
        // Re-queue failed requests
        this.queuedRequests.push(request);
      }
    }
  }

  /**
   * Build prompt for AI summary generation
   */
  private buildPrompt(rideData: {
    distance: number;
    duration: number;
    averageSpeed: number;
  }): string {
    const { distance, duration, averageSpeed } = rideData;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    
    let timeString = '';
    if (hours > 0) {
      timeString = `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      timeString = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    return `Generate an encouraging cycling summary for this ride:
- Distance: ${distance.toFixed(2)} km
- Duration: ${timeString}
- Average Speed: ${averageSpeed.toFixed(1)} km/h

Keep it positive, motivational, and under 60 words.`;
  }

  /**
   * Generate a mock summary for offline use
   */
  private generateMockSummary(rideData: {
    distance: number;
    duration: number;
    averageSpeed: number;
  }): string {
    const { distance, averageSpeed } = rideData;
    
    const summaries = [
      `Great ride! You covered ${distance.toFixed(1)}km at ${averageSpeed.toFixed(1)} km/h. Every pedal stroke counts toward your fitness goals. Keep up the excellent work! 🚴‍♀️`,
      `Fantastic effort today! ${distance.toFixed(1)}km in the books with solid pacing at ${averageSpeed.toFixed(1)} km/h. You're building strength and endurance with every ride. Well done! 💪`,
      `Another successful ride completed! ${distance.toFixed(1)}km at ${averageSpeed.toFixed(1)} km/h shows your dedication. Keep pushing forward and enjoy the journey ahead! 🌟`,
      `Awesome job out there! You've conquered ${distance.toFixed(1)}km with great consistency. Your commitment to cycling is inspiring. Ready for the next adventure? 🚲`,
      `Excellent work today! ${distance.toFixed(1)}km at ${averageSpeed.toFixed(1)} km/h demonstrates your growing fitness. Each ride makes you stronger. Keep it up! ⭐`,
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  }

  /**
   * Queue a summary request for later processing
   */
  private queueSummaryRequest(
    rideId: string,
    rideData: {
      distance: number;
      duration: number;
      averageSpeed: number;
    }
  ): void {
    this.queuedRequests.push({
      rideId,
      rideData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check network connectivity
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get number of queued requests
   */
  getQueuedRequestsCount(): number {
    return this.queuedRequests.length;
  }

  /**
   * Clear all queued requests
   */
  clearQueue(): void {
    this.queuedRequests = [];
  }
}

export const aiSummaryService = new AISummaryService(); 