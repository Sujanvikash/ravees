from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """The base of every request and response body. Fields are snake_case in Python and camelCase in JSON
    (in_season <-> inSeason, as the frontend uses); requests may use either spelling."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
    )
