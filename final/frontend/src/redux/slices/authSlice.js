import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';

// Async thunks for authentication operations
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedProfileStr = await AsyncStorage.getItem('userProfile');
      
      if (!storedToken || !storedUserId) {
        return { userToken: null, userId: null, userProfile: null };
      }
      
      // If we have stored credentials, validate them with the server
      try {
        // Get current user profile including avatar
        const userData = await authAPI.getCurrentUser();
        
        // Check if userData is null (user not found)
        if (!userData) {
          // Clean up stored credentials
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('userProfile');
          
          return { userToken: null, userId: null, userProfile: null };
        }
        
        // Store profile data without the avatar to prevent CursorWindow errors
        const profileForStorage = {...userData};
        if (profileForStorage.avatar) {
          profileForStorage.hasAvatar = true;
          delete profileForStorage.avatar;
        }
        
        // Update stored profile
        await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
        
        return {
          userToken: storedToken,
          userId: storedUserId,
          userProfile: userData
        };
      } catch (error) {
        // Clean up stored credentials on error
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userProfile');
        
        return { userToken: null, userId: null, userProfile: null };
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (!response || !response.user || !response.token) {
        throw new Error('Invalid login response from server');
      }
      
      // Fetch the complete user profile including avatar
      const currentUser = await authAPI.getCurrentUser();
      
      return {
        userToken: response.token,
        userId: response.user.id.toString(),
        userProfile: currentUser || response.user
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await authAPI.logout();
      
      // Clear all auth-related items from storage
      const keysToRemove = [
        'userToken', 
        'userId', 
        'userProfile',
      ];
      
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      // Dispatch socket disconnect
      dispatch({ type: 'socket/disconnect' });
      
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { getState, rejectWithValue }) => {
    try {
      const updatedProfile = await authAPI.updateProfile(profileData);
      
      // If we previously had a complete profile with avatar, preserve it
      const currentProfile = getState().auth.userProfile;
      if (currentProfile && currentProfile.avatar) {
        updatedProfile.avatar = currentProfile.avatar;
      }
      
      // Store profile data without the avatar to prevent CursorWindow errors
      const profileForStorage = {...updatedProfile};
      if (profileForStorage.avatar) {
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      // Update stored profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return updatedProfile;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadUserAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (imageUri, { rejectWithValue }) => {
    try {
      await authAPI.uploadAvatar(imageUri);
      
      // Get updated profile with avatar
      const updatedProfile = await authAPI.getCurrentUser();
      
      // Store profile data without the avatar to prevent CursorWindow errors
      const profileForStorage = {...updatedProfile};
      if (profileForStorage.avatar) {
        profileForStorage.hasAvatar = true;
        delete profileForStorage.avatar;
      }
      
      // Update stored profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileForStorage));
      
      return updatedProfile;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isLoading: true,
    userToken: null,
    userId: null,
    userProfile: null,
    error: null,
  },
  reducers: {
    resetAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Bootstrap auth
      .addCase(bootstrapAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userToken = action.payload.userToken;
        state.userId = action.payload.userId;
        state.userProfile = action.payload.userProfile;
        state.error = null;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userToken = action.payload.userToken;
        state.userId = action.payload.userId;
        state.userProfile = action.payload.userProfile;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.userToken = null;
        state.userId = null;
        state.userProfile = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Upload avatar
      .addCase(uploadUserAvatar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadUserAvatar.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(uploadUserAvatar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetAuthError } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state) => !!state.auth.userToken;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectUserProfile = (state) => state.auth.userProfile;
export const selectUserId = (state) => state.auth.userId;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer; 