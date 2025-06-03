import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types
interface User {
  id: number;
  name: string;
  email: string;
  username: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// API functions
const api = {
  async getUsers(): Promise<User[]> {
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  async getUser(id: number): Promise<User> {
    const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },

  async getPosts(): Promise<Post[]> {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts');
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    return response.json();
  },

  async getUserPosts(userId: number): Promise<Post[]> {
    const response = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user posts');
    }
    return response.json();
  },

  async createPost(post: Omit<Post, 'id'>): Promise<Post> {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    if (!response.ok) {
      throw new Error('Failed to create post');
    }
    return response.json();
  },
};

// Query keys
export const queryKeys = {
  users: ['users'] as const,
  user: (id: number) => ['users', id] as const,
  posts: ['posts'] as const,
  userPosts: (userId: number) => ['posts', 'user', userId] as const,
};

// Hooks
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: api.getUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => api.getUser(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePosts() {
  return useQuery({
    queryKey: queryKeys.posts,
    queryFn: api.getPosts,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserPosts(userId: number) {
  return useQuery({
    queryKey: queryKeys.userPosts(userId),
    queryFn: () => api.getUserPosts(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createPost,
    onSuccess: () => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

// Utility hook for prefetching
export function usePrefetchUser() {
  const queryClient = useQueryClient();
  
  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user(id),
      queryFn: () => api.getUser(id),
      staleTime: 5 * 60 * 1000,
    });
  };
} 