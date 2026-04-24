# 📋 DeMoviefy - Code Organization & Documentation Guide

## Overview

This guide provides the complete structure for organizing and documenting DeMoviefy code following the MVC pattern and best practices.

---

## Backend Architecture (Python/Flask)

### 1. Models Layer (`app/models/`)

**Purpose**: Define database entities and data structures

**File Template**:

```python
"""
[MODEL_NAME] MODEL
------------------
Brief description of the model's purpose.
Part of the MVC pattern (Model-View-Controller).
"""

from datetime import datetime
from app import db

class VideoModel(db.Model):
    """
    [Model Name] - SQLAlchemy ORM Model

    Detailed description of the model's responsibilities
    and how it relates to other entities.

    Attributes:
        field_name (type): Description
    """
    __tablename__ = "table_name"

    # Relationship to other models
    id = db.Column(db.Integer, primary_key=True)

    def to_dict(self) -> dict:
        """Convert model to dictionary for API responses."""
        return {}
```

**Key Points**:

- ✅ Include comprehensive docstrings
- ✅ Define relationships clearly
- ✅ Include `to_dict()` serialization methods
- ✅ Type hints on all methods

---

### 2. Repository Layer (`app/repositories/`)

**Purpose**: Handle all database CRUD operations

**File Template**:

```python
"""
[NAME] REPOSITORY
-----------------
Repository layer for [Model] CRUD operations.
Handles all database interactions.
Part of the MVC pattern (Model-View-Controller).
"""

from app import db
from app.models.model_name import ModelName

def create_[name](*, **kwargs) -> ModelName:
    """
    Create a new [name] record.

    Args:
        **kwargs: Field values for the new record

    Returns:
        ModelName: The newly created object with assigned ID

    Raises:
        SQLAlchemy exceptions if database operation fails
    """
    obj = ModelName(**kwargs)
    db.session.add(obj)
    db.session.commit()
    return obj

def get_[name](id: int) -> ModelName | None:
    """Retrieve a single record by ID."""
    return db.session.get(ModelName, id)

def list_[names]() -> list[ModelName]:
    """Retrieve all records."""
    return ModelName.query.all()

def update_[name](obj: ModelName, **kwargs) -> ModelName:
    """Update specific fields of a record."""
    for key, value in kwargs.items():
        if hasattr(obj, key):
            setattr(obj, key, value)
    db.session.commit()
    return obj

def delete_[name](obj: ModelName) -> None:
    """Delete a record from the database."""
    db.session.delete(obj)
    db.session.commit()
```

**Key Points**:

- ✅ Pure CRUD operations only
- ✅ No business logic here
- ✅ Return model instances, not dictionaries
- ✅ Consistent parameter naming

---

### 3. Services Layer (`app/services/`)

**Purpose**: Business logic, validation, and orchestration

**File Template**:

```python
"""
[SERVICE_NAME] SERVICE
----------------------
Service layer for [feature] business logic.
Handles validation, orchestration, and complex operations.
Part of the MVC pattern (Model-View-Controller).

Key Responsibilities:
- Business logic implementation
- Input validation
- Calling multiple repositories
- Complex calculations/aggregations
- Error handling
"""

from app.repositories import video_repository
from app.models.video import Video

def [operation_name](*, param1: str, param2: int) -> dict:
    """
    Brief description of operation.

    Detailed explanation of what this does, including:
    - Pre-conditions
    - Side effects
    - Error scenarios

    Args:
        param1 (str): Description
        param2 (int): Description

    Returns:
        dict: Description of return structure

    Raises:
        ValueError: When validation fails
        RuntimeError: When operation fails
    """
    # Validation
    if not param1:
        raise ValueError("param1 cannot be empty")

    # Business logic
    video = video_repository.get_video(param2)
    if not video:
        raise ValueError(f"Video {param2} not found")

    # Process
    result = {
        "success": True,
        "data": video.to_dict()
    }

    return result
```

**Key Points**:

- ✅ Comprehensive docstrings with parameter descriptions
- ✅ Input validation with meaningful error messages
- ✅ Single responsibility per function
- ✅ Clear exception documentation

---

### 4. Controllers Layer (`app/controllers/`)

**Purpose**: HTTP request handling and response formatting

**File Template**:

```python
"""
[NAME] CONTROLLER
-----------------
Controller layer for HTTP [resource] endpoints.
Handles request validation, service calls, and responses.
Part of the MVC pattern (Model-View-Controller).

This module manages the following operations:
- POST /[resource]: Create
- GET /[resource]: List/Retrieve
- PUT /[resource]/<id>: Update
- DELETE /[resource]/<id>: Delete
"""

from flask import request, jsonify
from app.services import [service_name]
from app.core.decorators import require_auth

@require_auth
def create_resource():
    """
    Create a new resource.

    Request Body:
        field1 (str): Required field description
        field2 (int): Optional field description

    Returns:
        200: {success: true, data: {...}}
        400: {error: "Validation error message"}
        401: {error: "Unauthorized"}
    """
    try:
        # Validate request format
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Validate inputs
        field1 = data.get("field1", "").strip()
        if not field1:
            return jsonify({"error": "field1 is required"}), 400

        # Call service
        result = [service_name].create(field1=field1)

        # Return response
        return jsonify({
            "success": True,
            "data": result
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500
```

**Key Points**:

- ✅ Comprehensive docstrings with request/response formats
- ✅ Validation before service calls
- ✅ Proper HTTP status codes
- ✅ Error handling with user-friendly messages

---

### 5. Configuration (`app/config/`)

**Purpose**: Settings, paths, and constants

**Key Files**:

- `settings.py`: Application configuration
- `paths.py`: File system paths
- `logging.py`: Logger setup

---

## Frontend Architecture (React/TypeScript)

### 1. Services (`src/services/`)

**Purpose**: API communication and external service integrations

**File Template**:

```typescript
/**
 * API Service for [Feature]
 *
 * Handles HTTP communication with backend endpoints.
 * Defines TypeScript interfaces for type safety.
 *
 * API Base: http://127.0.0.1:5000
 */

import axios, { AxiosError } from "axios";

export interface [EntityName] {
  id: string;
  name: string;
  // ... other fields
}

export interface [OperationRequest] {
  field1: string;
  field2?: number;
}

export interface [OperationResponse] {
  success: boolean;
  data?: [EntityName];
  error?: string;
}

/**
 * Service class for [Entity] operations
 */
export class [EntityService] {
  private static readonly API_BASE = "http://127.0.0.1:5000";

  /**
   * Fetch all [entities]
   *
   * @returns Promise with array of entities
   * @throws Error if request fails
   */
  static async fetchAll(): Promise<[EntityName][]> {
    try {
      const response = await axios.get<[EntityName][]>(
        `${this.API_BASE}/[entities]`,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching entities:", error);
      throw error;
    }
  }

  /**
   * Create new [entity]
   *
   * @param payload - Request data
   * @returns Promise with created entity
   */
  static async create(payload: [OperationRequest]): Promise<[EntityName]> {
    const response = await axios.post<[OperationResponse]>(
      `${this.API_BASE}/[entities]`,
      payload,
      { withCredentials: true }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "Operation failed");
    }

    return response.data.data!;
  }
}
```

**Key Points**:

- ✅ Clear TypeScript interfaces
- ✅ Comprehensive JSDoc comments
- ✅ Error handling with logging
- ✅ Static methods for organization

---

### 2. Components (`src/components/`)

**Purpose**: Reusable UI building blocks

**File Template**:

````typescript
/**
 * [ComponentName] Component
 *
 * Description of component's purpose and usage.
 *
 * @example
 * ```tsx
 * <ComponentName prop1="value" onEvent={handler} />
 * ```
 */

import React from "react";

interface ComponentProps {
  /** Description of prop1 */
  prop1: string;

  /** Optional description */
  prop2?: number;

  /** Callback when event occurs */
  onEvent?: (data: any) => void;
}

export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  onEvent,
}) => {
  // Component logic

  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
};
````

**Key Points**:

- ✅ Clear prop documentation
- ✅ Usage examples in JSDoc
- ✅ Typed with React.FC
- ✅ Single responsibility

---

### 3. Pages (`src/pages/`)

**Purpose**: Route-level components

**Key Pattern**:

```typescript
/**
 * [PageName] Page
 *
 * Main page component for [feature].
 * Manages page-level state and orchestrates sub-components.
 */

export const [PageName]: React.FC = () => {
  const [state, setState] = useState<State>("initial");

  useEffect(() => {
    // Initialization
  }, []);

  return (
    <MainLayout>
      {/* Page content */}
    </MainLayout>
  );
};
```

---

### 4. Types (`src/features/[feature]/types.ts`)

**Purpose**: Feature-specific TypeScript interfaces

```typescript
/**
 * Type definitions for [Feature]
 *
 * Centralized location for all interfaces and types
 * used in the [feature] feature.
 */

export interface EntityRecord {
  id: string;
  name: string;
  // ... fields
}

export interface OperationState {
  loading: boolean;
  error?: string;
  // ... state fields
}
```

---

### 5. Styling (`src/styles/global.css`)

**Purpose**: Global styles with CSS variables

**Structure**:

```css
/* ============================================================================
   SECTION NAME
   ============================================================================ */

/* Subsection - Specific Components */

.component-class {
  /* Base styles */
}

.component-class:hover {
  /* Interactive states */
}

/* Responsive */
@media (max-width: 768px) {
  .component-class {
    /* Mobile styles */
  }
}
```

---

## Documentation Best Practices

### 1. Docstring Standards

**Python (Backend)**:

```python
def function_name(param1: str, param2: int) -> dict:
    """
    Short one-line description.

    Longer explanation of what the function does,
    including any important details about behavior
    or side effects.

    Args:
        param1 (str): Description of first parameter
        param2 (int): Description of second parameter

    Returns:
        dict: Description of returned value structure

    Raises:
        ValueError: When param1 is invalid
        RuntimeError: When operation fails

    Example:
        >>> result = function_name("test", 42)
        >>> result["success"]
        True
    """
```

**TypeScript (Frontend)**:

````typescript
/**
 * Function description
 *
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description of return value
 * @throws Error if something fails
 *
 * @example
 * ```ts
 * const result = await function(param1, param2);
 * ```
 */
export async function functionName(
  param1: string,
  param2: number,
): Promise<Result> {
  // Implementation
}
````

### 2. Code Comments

- Use `#` (Python) or `//` (TypeScript) for inline comments
- Comment the "why", not the "what"
- Use section separators for organization
- Keep comments up-to-date with code changes

### 3. README Files

Each major component should have a README:

```markdown
# [Component Name]

Brief description of what this component/module does.

## Overview

Detailed explanation of functionality, architecture, and responsibilities.

## File Structure
```

path/
**init**.py
file1.py
file2.py

````

## Usage

```python
from module import function
result = function(param)
````

## Testing

How to test this component.

## Dependencies

List external dependencies.

## Future Improvements

Known issues, TODOs, or planned enhancements.

```

---

## Quality Checklist

### Backend
- ✅ All functions have docstrings
- ✅ All parameters have type hints
- ✅ All return values are documented
- ✅ Error cases are documented
- ✅ No hardcoded values (use config)
- ✅ Proper exception handling
- ✅ No code duplication

### Frontend
- ✅ All components have JSDoc comments
- ✅ All props are documented
- ✅ TypeScript interfaces are defined
- ✅ Error handling is implemented
- ✅ Loading states are shown
- ✅ No console errors/warnings
- ✅ Responsive design is tested

### General
- ✅ Clear file organization
- ✅ Meaningful variable names
- ✅ No dead code
- ✅ No commented-out code
- ✅ Consistent code style
- ✅ Clear commit messages
- ✅ README documentation

---

## Next Steps

1. ✅ Add docstrings to all backend functions
2. ✅ Add JSDoc comments to all frontend components
3. ✅ Create README files for major modules
4. ✅ Organize CSS with clear section comments
5. ⏳ Add unit tests with clear documentation
6. ⏳ Create API documentation (Swagger/OpenAPI)
7. ⏳ Add database migration documentation

---

## References

- [Python Docstring Convention (PEP 257)](https://www.python.org/dev/peps/pep-0257/)
- [JSDoc Reference](https://jsdoc.app/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [MVC Pattern](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)
```
