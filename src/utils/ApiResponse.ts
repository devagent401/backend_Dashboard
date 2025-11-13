interface ApiResponseData<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

class ApiResponse<T = any> {
  static success<T>(data?: T, message = 'Success', statusCode = 200): ApiResponseData<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static successWithMeta<T>(
    data: T,
    meta: { page: number; limit: number; total: number; totalPages: number },
    message = 'Success'
  ): ApiResponseData<T> {
    return {
      success: true,
      message,
      data,
      meta,
    };
  }

  static error(message = 'Error', statusCode = 500): ApiResponseData {
    return {
      success: false,
      message,
    };
  }

  static created<T>(data?: T, message = 'Created successfully'): ApiResponseData<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static updated<T>(data?: T, message = 'Updated successfully'): ApiResponseData<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static deleted(message = 'Deleted successfully'): ApiResponseData {
    return {
      success: true,
      message,
    };
  }
}

export default ApiResponse;

