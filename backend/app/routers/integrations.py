from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from .. import models, integrations

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


class SendEmailIn(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/send-email")
def send_email(body: SendEmailIn, _user=Depends(get_current_user)):
    return integrations.send_email(body.to, body.subject, body.body)


@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...), _user=Depends(get_current_user)):
    contents = await file.read()
    url = integrations.save_upload(file.filename, contents)
    return {"file_url": url}


class InvokeLLMIn(BaseModel):
    prompt: str
    response_json_schema: dict | None = None


@router.post("/invoke-llm")
def invoke_llm(body: InvokeLLMIn, _user=Depends(get_current_user)):
    return integrations.invoke_llm(body.prompt, body.response_json_schema)


class PageViewIn(BaseModel):
    page: str


@router.post("/page-view")
def page_view(body: PageViewIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    db.add(models.PageView(page=body.page, user_id=user.id))
    db.commit()
    return {"ok": True}
